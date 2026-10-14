// ========== Imports: ==========
import { EventDocument } from '../../events/schemas/event.schema';
import { ReviewCategory } from '../../events/schemas/review-category.schema';

export type ReviewEligibilityStatus =
    | 'OPEN'
    | 'NOT_ATTENDED'
    | 'ALREADY_REVIEWED'
    | 'NOT_ENDED'
    | 'CLOSED'
    | 'NO_CATEGORIES';

export class ReviewableEventDto {
    id!: string;
    title!: string;
    date!: Date;
    endDate!: Date | null;
    reviewCategories!: ReviewCategory[];
    closesAt!: Date;

    static fromEvent(event: EventDocument, closesAt: Date): ReviewableEventDto {
        return {
            id:                 event._id.toString(),
            title:              event.title,
            date:               event.date,
            endDate:            event.endDate ?? null,
            reviewCategories:   event.reviewCategories.map((category: ReviewCategory) => ({ id: category.id, name: category.name })),
            closesAt,
        };
    }
}

export class ReviewEligibilityDto {
    status!: ReviewEligibilityStatus;
    event!: ReviewableEventDto | null;
}
