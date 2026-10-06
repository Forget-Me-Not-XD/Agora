// ========== Imports: ==========
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model, Types } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { Event, EventDocument } from '../events/schemas/event.schema';
import { ReviewCategory } from '../events/schemas/review-category.schema';
import { Rsvp, RsvpDocument } from '../rsvp/schemas/rsvp.schema';
import { CreateReviewDto } from './dto/create-review.dto';
import { RatingInputDto } from './dto/rating-input.dto';
import { PendingReviewDto } from './dto/pending-review.dto';
import { ReviewableEventDto, ReviewEligibilityDto } from './dto/review-eligibility.dto';
import { MyReviewStateDto } from './dto/my-review-state.dto';
import { CategorySummaryDto, ReviewCommentDto, ReviewSummaryDto } from './dto/review-summary.dto';
import { Role } from '../common/enums/role.enums';
import { REVIEW_LIMITS } from '../common/constants/review-categories';

const REVIEW_WINDOW_MS = REVIEW_LIMITS.windowDays * 24 * 60 * 60 * 1000;

@Injectable()
export class ReviewsService {
    constructor(
        @InjectModel(Review.name) private readonly reviewModel: Model<ReviewDocument>,
        @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
        @InjectModel(Rsvp.name) private readonly rsvpModel: Model<RsvpDocument>,
    ) {}

    async create(dto: CreateReviewDto, userId: string): Promise<ReviewDocument> {
        const event = await this.findEventOrThrow(dto.eventId);

        if (!(await this.hasAttended(event._id, userId))) {
            throw new ForbiddenException('Slegs bywoners wat by die geleentheid ingeskandeer is, kan dit beoordeel');
        }

        this.assertReviewWindowOpen(event);
        this.assertRatingsMatchCategories(dto.ratings, event.reviewCategories);

        const review = await this.saveReview(event._id, userId, dto);
        await this.recalculateEventRating(event._id);
        return review;
    }

    async getEligibility(eventId: string, userId: string): Promise<ReviewEligibilityDto> {
        const event = await this.findEventOrThrow(eventId);

        // Wie nie by die geleentheid was nie, kry niks daarvan te sien nie
        if (!(await this.hasAttended(event._id, userId))) {
            return { status: 'NOT_ATTENDED', event: null };
        }

        const details = ReviewableEventDto.fromEvent(event, this.getReviewWindow(event).closesAt);

        const reviewed = await this.reviewModel.exists({ event: event._id, user: userId }).exec();
        if (reviewed) return { status: 'ALREADY_REVIEWED', event: details };
        if (event.reviewCategories.length === 0) return { status: 'NO_CATEGORIES', event: details };

        return { status: this.getWindowState(event, Date.now()), event: details };
    }

    async findPending(userId: string): Promise<PendingReviewDto[]> {
        const { attendedEventIds, reviewedEventIds } = await this.findUserEventIds(userId);
        const events = await this.findUnreviewedEvents(attendedEventIds, reviewedEventIds);
        const now = Date.now();

        return events
            .filter((event) => this.getWindowState(event, now) === 'OPEN')
            .map((event) => PendingReviewDto.fromEvent(event, this.getReviewWindow(event).closesAt))
            .sort((a, b) => a.closesAt.getTime() - b.closesAt.getTime());
    }

    async getMyReviewState(userId: string): Promise<MyReviewStateDto> {
        const { attendedEventIds, reviewedEventIds } = await this.findUserEventIds(userId);
        const events = await this.findUnreviewedEvents(attendedEventIds, reviewedEventIds, 'date endDate');
        const now = Date.now();

        const state: MyReviewStateDto = {
            reviewable: [],
            reviewed:   reviewedEventIds.map((id) => id.toString()),
            closed:     [],
            upcoming:   [],
        };

        for (const event of events) {
            const id = event._id.toString();
            const windowState = this.getWindowState(event, now);
            if (windowState === 'OPEN') state.reviewable.push(id);
            else if (windowState === 'CLOSED') state.closed.push(id);
            else state.upcoming.push(id);
        }

        return state;
    }

    async getEventSummary(eventId: string, requesterId: string, requesterRole: Role): Promise<ReviewSummaryDto> {
        const event = await this.findEventOrThrow(eventId);

        if (requesterRole !== Role.ADMIN && event.createdBy.toString() !== requesterId) {
            throw new ForbiddenException('Slegs die skepper van die geleentheid of \'n admin kan die resensies sien');
        }

        const reviews = await this.reviewModel
            .find({ event: event._id })
            .sort({ createdAt: -1 })
            .exec();

        const allScores = reviews.flatMap((review) => review.ratings.map((rating) => rating.score));

        const comments: ReviewCommentDto[] = reviews.flatMap((review) =>
            review.comment ? [{ comment: review.comment, createdAt: review.createdAt! }] : [],
        );

        return {
            count:      reviews.length,
            overallAvg: this.average(allScores),
            categories: event.reviewCategories.map((category) => this.summariseCategory(category, reviews)),
            comments,
        };
    }

    async deleteByEvent(eventId: string): Promise<void> {
        await this.reviewModel.deleteMany({ event: eventId }).exec();
    }

    private async findEventOrThrow(eventId: string): Promise<EventDocument> {
        if (!isValidObjectId(eventId)) {
            throw new NotFoundException(`Geleentheid ${eventId} is nie gevind nie`);
        }

        const event = await this.eventModel.findById(eventId).exec();
        if (!event) {
            throw new NotFoundException(`Geleentheid ${eventId} is nie gevind nie`);
        }

        return event;
    }

    private async findUserEventIds(userId: string): Promise<{ attendedEventIds: Types.ObjectId[]; reviewedEventIds: Types.ObjectId[] }> {
        const [attendedEventIds, reviewedEventIds] = await Promise.all([
            this.rsvpModel.distinct('event', { user: userId, checkedIn: true }).exec(),
            this.reviewModel.distinct('event', { user: userId }).exec(),
        ]);
        return { attendedEventIds, reviewedEventIds };
    }

    // Bygewoonde geleenthede met kategorieë wat die gebruiker nog nie beoordeel het nie. Of die
    // venster oop is, besluit getWindowState, sodat die reël net op een plek staan.
    private findUnreviewedEvents(
        attendedEventIds: Types.ObjectId[],
        reviewedEventIds: Types.ObjectId[],
        fields?: string,
    ): Promise<EventDocument[]> {
        return this.eventModel
            .find({ _id: { $in: attendedEventIds, $nin: reviewedEventIds }, 'reviewCategories.0': { $exists: true } })
            .select(fields ?? {})
            .exec();
    }

    private async hasAttended(eventId: Types.ObjectId, userId: string): Promise<boolean> {
        const rsvp = await this.rsvpModel.exists({ event: eventId, user: userId, checkedIn: true }).exec();
        return rsvp !== null;
    }

    private getReviewWindow(event: EventDocument): { opensAt: Date; closesAt: Date } {
        const opensAt = event.endDate ?? event.date;
        return { opensAt, closesAt: new Date(opensAt.getTime() + REVIEW_WINDOW_MS) };
    }

    private getWindowState(event: EventDocument, now: number): 'NOT_ENDED' | 'OPEN' | 'CLOSED' {
        const { opensAt, closesAt } = this.getReviewWindow(event);
        if (now < opensAt.getTime()) return 'NOT_ENDED';
        if (now > closesAt.getTime()) return 'CLOSED';
        return 'OPEN';
    }

    private assertReviewWindowOpen(event: EventDocument): void {
        const windowState = this.getWindowState(event, Date.now());

        if (windowState === 'NOT_ENDED') {
            throw new BadRequestException('Jy kan eers \'n resensie gee nadat die geleentheid geëindig het');
        }

        if (windowState === 'CLOSED') {
            throw new BadRequestException(`Die resensie-venster het ${REVIEW_LIMITS.windowDays} dae na die geleentheid gesluit`);
        }
    }

    private assertRatingsMatchCategories(ratings: RatingInputDto[], categories: ReviewCategory[]): void {
        const categoryIds = new Set(categories.map((category) => category.id));
        const ratedIds = new Set(ratings.map((rating) => rating.categoryId));

        const hasNoDuplicates = ratedIds.size === ratings.length;
        const coversEveryCategory = ratings.length === categoryIds.size;
        const allIdsAreValid = ratings.every((rating) => categoryIds.has(rating.categoryId));

        if (!hasNoDuplicates || !coversEveryCategory || !allIdsAreValid) {
            throw new BadRequestException('Gee presies een telling vir elke kategorie van die geleentheid');
        }
    }

    private async saveReview(eventId: Types.ObjectId, userId: string, dto: CreateReviewDto): Promise<ReviewDocument> {
        try {
            return await this.reviewModel.create({
                event:   eventId,
                user:    new Types.ObjectId(userId),
                ratings: dto.ratings.map((rating) => ({ categoryId: rating.categoryId, score: rating.score })),
                comment: dto.comment || undefined,
            });
        } catch (err) {
            if (this.isDuplicateKeyError(err)) {
                throw new ConflictException('Jy het hierdie geleentheid reeds beoordeel');
            }
            throw err;
        }
    }

    private async recalculateEventRating(eventId: Types.ObjectId): Promise<void> {
        // Een aggregasie, sodat die telling en die gemiddeld van dieselfde resensies kom
        const [totals] = await this.reviewModel.aggregate<{ count: number; scoreSum: number; scoreCount: number }>([
            { $match: { event: eventId } },
            {
                $group: {
                    _id:        null,
                    count:      { $sum: 1 },
                    scoreSum:   { $sum: { $sum: '$ratings.score' } },
                    scoreCount: { $sum: { $size: '$ratings' } },
                },
            },
        ]);
        if (!totals) return;

        const ratingAvg = totals.scoreCount > 0 ? this.round(totals.scoreSum / totals.scoreCount) : null;

        // Resensies word net bygevoeg (en net saam met die geleentheid uitgevee), so 'n hoër telling
        // is altyd die nuwer stand. Kom twee gelyktydige resensies hier in die verkeerde volgorde
        // aan, keer die voorwaarde dat die ouer een die nuwer een oorskryf.
        await this.eventModel
            .updateOne(
                { _id: eventId, ratingCount: { $not: { $gte: totals.count } } },
                { ratingAvg, ratingCount: totals.count },
            )
            .exec();
    }

    private summariseCategory(category: ReviewCategory, reviews: ReviewDocument[]): CategorySummaryDto {
        const scores = reviews.flatMap((review) =>
            review.ratings
                .filter((rating) => rating.categoryId === category.id)
                .map((rating) => rating.score),
        );

        const distribution = new Array<number>(REVIEW_LIMITS.maxScore + 1).fill(0);
        for (const score of scores) {
            distribution[score] += 1;
        }

        return { id: category.id, name: category.name, avg: this.average(scores), distribution };
    }

    private average(values: number[]): number | null {
        if (values.length === 0) return null;
        const total = values.reduce((sum, value) => sum + value, 0);
        return this.round(total / values.length);
    }

    private round(value: number): number {
        return Math.round(value * 100) / 100;
    }

    private isDuplicateKeyError(err: unknown): boolean {
        return typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === 11000;
    }
}
