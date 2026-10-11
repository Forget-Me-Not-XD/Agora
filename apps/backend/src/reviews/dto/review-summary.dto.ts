// ========== Imports: ==========

export class CategorySummaryDto {
    id!: string;
    name!: string;
    avg!: number | null;
    distribution!: number[];
}

export class ReviewCommentDto {
    comment!: string;
    createdAt!: Date;
}

export class ReviewSummaryDto {
    count!: number;
    overallAvg!: number | null;
    categories!: CategorySummaryDto[];
    comments!: ReviewCommentDto[];
    // Elke resensie se algehele telling (die gemiddeld van sy kategorieë), van laag na hoog
    reviewScores!: number[];
}
