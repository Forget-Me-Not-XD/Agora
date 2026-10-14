// ========== Imports: ==========
import { BadRequestException, ConflictException, ForbiddenException, ValidationPipe } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { ReviewsService } from './reviews.service';
import { Review } from './schemas/review.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { Event } from '../events/schemas/event.schema';
import { Rsvp } from '../rsvp/schemas/rsvp.schema';
import { Notification, NotificationType } from '../notifications/schemas/notification.schema';
import { REVIEW_LIMITS } from '../common/constants/review-categories';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const WINDOW_MS = REVIEW_LIMITS.windowDays * DAY;
const NOW = new Date('2026-10-12T12:00:00+02:00').getTime();

const CATEGORIES = [
    { id: 'organisasie', name: 'Organisasie' },
    { id: 'inhoud', name: 'Inhoud en Program' },
    { id: 'lokaal', name: 'Lokaal en Fasiliteite' },
];

// Die diens roep .exec() op elke Mongoose-navraag, so 'n mock gee net 'n objek met exec terug
const query = <T>(value: T) => ({ exec: jest.fn().mockResolvedValue(value) });

const ratingsFor = (score: number) => CATEGORIES.map((category) => ({ categoryId: category.id, score }));

// Die geleentheid was twee dae gelede klaar, so die venster is oop, tensy 'n toets self ander datums gee
function makeEvent(dates: { date?: Date; endDate?: Date } = {}) {
    return {
        _id:              new Types.ObjectId(),
        date:             dates.date ?? new Date(NOW - 2 * DAY - 3 * HOUR),
        endDate:          'endDate' in dates ? dates.endDate : new Date(NOW - 2 * DAY),
        reviewCategories: CATEGORIES,
    };
}

describe('ReviewsService.create', () => {
    let service: ReviewsService;
    let event: ReturnType<typeof makeEvent>;
    let userId: string;

    const reviewModel = { create: jest.fn(), aggregate: jest.fn() };
    const eventModel = { findById: jest.fn(), updateOne: jest.fn() };
    const rsvpModel = { exists: jest.fn() };
    const notificationModel = { deleteMany: jest.fn() };

    const dtoFor = (ratings = ratingsFor(4)): CreateReviewDto => ({
        eventId: event._id.toString(),
        ratings,
        comment: 'Baie goed gereel',
    });

    // Stel die geleentheid wat findById teruggee, sodat elke toets sy eie datums kan kies
    const useEvent = (next: ReturnType<typeof makeEvent>) => {
        event = next;
        eventModel.findById.mockReturnValue(query(event));
    };

    beforeEach(async () => {
        jest.resetAllMocks();
        jest.spyOn(Date, 'now').mockReturnValue(NOW);

        // Hierdie waardes is die suksespad, en elke toets verander net die een ding wat hy wil toets
        useEvent(makeEvent());
        userId = new Types.ObjectId().toString();
        rsvpModel.exists.mockReturnValue(query({ _id: new Types.ObjectId() }));
        eventModel.updateOne.mockReturnValue(query({ matchedCount: 1, modifiedCount: 1 }));
        reviewModel.create.mockImplementation(async (doc: object) => ({ _id: new Types.ObjectId(), ...doc }));
        reviewModel.aggregate.mockResolvedValue([{ count: 1, scoreSum: 12, scoreCount: 3 }]);
        notificationModel.deleteMany.mockReturnValue(query({ deletedCount: 1 }));

        const moduleRef = await Test.createTestingModule({
            providers: [
                ReviewsService,
                { provide: getModelToken(Review.name), useValue: reviewModel },
                { provide: getModelToken(Event.name), useValue: eventModel },
                { provide: getModelToken(Rsvp.name), useValue: rsvpModel },
                { provide: getModelToken(Notification.name), useValue: notificationModel },
            ],
        }).compile();

        service = moduleRef.get(ReviewsService);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('stoor die resensie van iemand wat bygewoon het en ruim die versoek op', async () => {
        await service.create(dtoFor(), userId);

        const saved = reviewModel.create.mock.calls[0][0];
        expect(saved.event).toBe(event._id);
        expect(saved.user.toString()).toBe(userId);
        expect(saved.ratings).toEqual(ratingsFor(4));
        expect(saved.comment).toBe('Baie goed gereel');

        expect(eventModel.updateOne).toHaveBeenCalledWith(
            expect.objectContaining({ _id: event._id }),
            { $set: { reviewCategoriesLocked: true } },
        );

        const removed = notificationModel.deleteMany.mock.calls[0][0];
        expect(removed.userId.toString()).toBe(userId);
        expect(removed.event).toBe(event._id);
        expect(removed.type).toBe(NotificationType.RESENSIE_VERSOEK);
    });

    describe('wie mag beoordeel', () => {
        it('gee 403 vir iemand wat nie ingeskandeer is nie', async () => {
            rsvpModel.exists.mockReturnValue(query(null));

            await expect(service.create(dtoFor(), userId)).rejects.toBeInstanceOf(ForbiddenException);

            // Net 'n ingeskandeerde RSVP tel, nie sommer enige RSVP nie
            expect(rsvpModel.exists).toHaveBeenCalledWith({ event: event._id, user: userId, checkedIn: true });
            expect(eventModel.updateOne).not.toHaveBeenCalled();
            expect(reviewModel.create).not.toHaveBeenCalled();
        });

        it('gee 409 as die gebruiker die geleentheid reeds beoordeel het', async () => {
            // Mongo se unieke indeks op event en user keer 'n tweede resensie met fout 11000
            reviewModel.create.mockRejectedValue(Object.assign(new Error('E11000 duplicate key error'), { code: 11000 }));

            await expect(service.create(dtoFor(), userId)).rejects.toBeInstanceOf(ConflictException);

            expect(notificationModel.deleteMany).not.toHaveBeenCalled();
            expect(reviewModel.aggregate).not.toHaveBeenCalled();
        });
    });

    describe('resensie-venster', () => {
        it('gee 400 voordat die geleentheid klaar is', async () => {
            useEvent(makeEvent({ date: new Date(NOW - HOUR), endDate: new Date(NOW + HOUR) }));

            const result = service.create(dtoFor(), userId);

            await expect(result).rejects.toBeInstanceOf(BadRequestException);
            await expect(result).rejects.toThrow('nadat die geleentheid');
            expect(reviewModel.create).not.toHaveBeenCalled();
        });

        it('gee 400 sodra die venster na die geleentheid gesluit het', async () => {
            useEvent(makeEvent({ endDate: new Date(NOW - WINDOW_MS - 1) }));

            const result = service.create(dtoFor(), userId);

            await expect(result).rejects.toBeInstanceOf(BadRequestException);
            await expect(result).rejects.toThrow(`${REVIEW_LIMITS.windowDays} dae na die geleentheid gesluit`);
            expect(reviewModel.create).not.toHaveBeenCalled();
        });

        it('is presies op die sluitingstyd nog oop', async () => {
            useEvent(makeEvent({ endDate: new Date(NOW - WINDOW_MS) }));

            await expect(service.create(dtoFor(), userId)).resolves.toBeDefined();
        });

        it('tel die venster vanaf die begindatum as daar geen endDate is nie', async () => {
            // As die venster later sou begin, soos 3 uur na die begin, sou dit hier nog oop wees
            useEvent(makeEvent({ date: new Date(NOW - WINDOW_MS - 1), endDate: undefined }));

            await expect(service.create(dtoFor(), userId)).rejects.toThrow('gesluit');
        });
    });

    describe('kategorie-tellings', () => {
        it.each([
            ['ontbreek',             [{ categoryId: 'organisasie', score: 4 }, { categoryId: 'inhoud', score: 4 }]],
            ['twee keer gegee word', [{ categoryId: 'organisasie', score: 4 }, { categoryId: 'organisasie', score: 4 }, { categoryId: 'inhoud', score: 4 }]],
            ['nie bestaan nie',      [...ratingsFor(4).slice(0, 2), { categoryId: 'onbekend', score: 4 }]],
        ])('gee 400 as een kategorie %s', async (_label, ratings) => {
            await expect(service.create(dtoFor(ratings), userId)).rejects.toBeInstanceOf(BadRequestException);

            expect(eventModel.updateOne).not.toHaveBeenCalled();
            expect(reviewModel.create).not.toHaveBeenCalled();
        });
    });

    describe('ratingAvg', () => {
        it('herbereken ratingAvg en ratingCount uit al die resensies', async () => {
            // Twee resensies met drie tellings elk gee 25 / 6 = 4.1666..., wat 4.17 moet word
            reviewModel.aggregate.mockResolvedValue([{ count: 2, scoreSum: 25, scoreCount: 6 }]);

            await service.create(dtoFor(), userId);

            expect(reviewModel.aggregate.mock.calls[0][0][0]).toEqual({ $match: { event: event._id } });
            expect(eventModel.updateOne).toHaveBeenLastCalledWith(
                { _id: event._id, ratingCount: { $not: { $gte: 2 } } },
                { ratingAvg: 4.17, ratingCount: 2 },
            );
        });

        it('stel ratingAvg op null as daar geen tellings is nie', async () => {
            reviewModel.aggregate.mockResolvedValue([{ count: 1, scoreSum: 0, scoreCount: 0 }]);

            await service.create(dtoFor(), userId);

            expect(eventModel.updateOne).toHaveBeenLastCalledWith(
                expect.anything(),
                { ratingAvg: null, ratingCount: 1 },
            );
        });
    });
});

// Die diens self kyk nie of 'n telling tussen 0 en 5 is nie. Dit doen die globale ValidationPipe
// aan die hand van CreateReviewDto, so hou die opsies hier gelyk aan die pipe in config/main.ts.
describe('CreateReviewDto validering', () => {
    const pipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    });

    const validate = (ratings: unknown) =>
        pipe.transform(
            { eventId: new Types.ObjectId().toString(), ratings },
            { type: 'body', metatype: CreateReviewDto },
        );

    // Die foutboodskap wys dat dit regtig die telling was wat die 400 gegee het, en nie iets anders nie
    const messagesOf = async (ratings: unknown): Promise<string[]> => {
        const error = await validate(ratings).catch((err: unknown) => err);
        expect(error).toBeInstanceOf(BadRequestException);
        return ((error as BadRequestException).getResponse() as { message: string[] }).message;
    };

    it('aanvaar die laagste en hoogste geldige telling', async () => {
        await expect(validate([{ categoryId: 'organisasie', score: 0 }, { categoryId: 'inhoud', score: 5 }])).resolves.toBeDefined();
    });

    it.each([6, -1])('gee 400 vir telling %d', async (score) => {
        const messages = await messagesOf([{ categoryId: 'organisasie', score }]);

        expect(messages).toEqual([expect.stringContaining('tussen 0 en 5')]);
    });

    it('gee 400 vir telling 4.5', async () => {
        const messages = await messagesOf([{ categoryId: 'organisasie', score: 4.5 }]);

        expect(messages).toEqual([expect.stringContaining('heelgetal')]);
    });
});
