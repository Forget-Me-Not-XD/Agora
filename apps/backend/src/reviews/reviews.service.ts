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

        const attended = await this.rsvpModel
            .exists({ event: event._id, user: userId, checkedIn: true })
            .exec();
        if (!attended) {
            throw new ForbiddenException('Slegs bywoners wat by die geleentheid ingeteken het, kan dit beoordeel');
        }

        this.assertReviewWindowOpen(event);
        this.assertRatingsMatchCategories(dto.ratings, event.reviewCategories);

        const review = await this.saveReview(event._id, userId, dto);
        await this.recalculateEventRating(event._id);
        return review;
    }

    async findPending(userId: string): Promise<PendingReviewDto[]> {
        const [attendedEventIds, reviewedEventIds] = await Promise.all([
            this.rsvpModel.distinct('event', { user: userId, checkedIn: true }).exec(),
            this.reviewModel.distinct('event', { user: userId }).exec(),
        ]);

        const now = new Date();
        const earliestEnd = new Date(now.getTime() - REVIEW_WINDOW_MS);

        const events = await this.eventModel
            .find({
                _id: { $in: attendedEventIds, $nin: reviewedEventIds },
                'reviewCategories.0': { $exists: true },
                $or: [
                    { endDate: { $gte: earliestEnd, $lte: now } },
                    { endDate: null, date: { $gte: earliestEnd, $lte: now } },
                ],
            })
            .exec();

        return events
            .map((event) => PendingReviewDto.fromEvent(event, this.getReviewWindow(event).closesAt))
            .sort((a, b) => a.closesAt.getTime() - b.closesAt.getTime());
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

    private getReviewWindow(event: EventDocument): { opensAt: Date; closesAt: Date } {
        const opensAt = event.endDate ?? event.date;
        return { opensAt, closesAt: new Date(opensAt.getTime() + REVIEW_WINDOW_MS) };
    }

    private assertReviewWindowOpen(event: EventDocument): void {
        const { opensAt, closesAt } = this.getReviewWindow(event);
        const now = Date.now();

        if (now < opensAt.getTime()) {
            throw new BadRequestException('Jy kan eers \'n resensie gee nadat die geleentheid geëindig het');
        }

        if (now > closesAt.getTime()) {
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
        const [count, averages] = await Promise.all([
            this.reviewModel.countDocuments({ event: eventId }).exec(),
            this.reviewModel.aggregate<{ avg: number }>([
                { $match: { event: eventId } },
                { $unwind: '$ratings' },
                { $group: { _id: null, avg: { $avg: '$ratings.score' } } },
            ]),
        ]);

        const ratingAvg = averages.length > 0 ? this.round(averages[0].avg) : null;

        await this.eventModel.updateOne({ _id: eventId }, { ratingAvg, ratingCount: count }).exec();
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
