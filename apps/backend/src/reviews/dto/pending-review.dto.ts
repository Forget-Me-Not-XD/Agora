// ========== Imports: ==========
import { EventDocument } from '../../events/schemas/event.schema';
import { ReviewCategory } from '../../events/schemas/review-category.schema';

export class PendingReviewDto {
    eventId!: string;
    title!: string;
    date!: Date;
    endDate!: Date | null;
    reviewCategories!: ReviewCategory[];
    closesAt!: Date;

    static fromEvent(event: EventDocument, closesAt: Date): PendingReviewDto {
        return {
            eventId:            event._id.toString(),
            title:              event.title,
            date:               event.date,
            endDate:            event.endDate ?? null,
            reviewCategories:   event.reviewCategories.map((category: ReviewCategory) => ({ id: category.id, name: category.name })),
            closesAt,
        };
    }
}
