// ========== Imports: ==========
import { ReviewDocument } from '../schemas/review.schema';
import { ReviewRating } from '../schemas/review-rating.schema';

export class ReviewResponseDto {
    id!: string;
    eventId!: string;
    ratings!: ReviewRating[];
    comment!: string | null;
    createdAt!: Date;

    static fromDocument(review: ReviewDocument): ReviewResponseDto {
        return {
            id:         review._id.toString(),
            eventId:    review.event.toString(),
            ratings:    review.ratings.map((rating: ReviewRating) => ({ categoryId: rating.categoryId, score: rating.score })),
            comment: review.comment ?? null,
            createdAt: review.createdAt!,
        };
    }
}