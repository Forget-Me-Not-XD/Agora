// ========== Imports: ==========
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';
import { REVIEW_LIMITS } from '../../common/constants/review-categories';

export class RatingInputDto {
    @IsString({ message: 'categoryId moet teks wees' })
    @IsNotEmpty({ message: 'categoryId mag nie leeg wees nie' })
    categoryId!: string;

    @IsInt({ message: 'Elke telling moet \'n heelgetal wees' })
    @Min(REVIEW_LIMITS.minScore, {
        message: `Elke telling moet tussen ${REVIEW_LIMITS.minScore} en ${REVIEW_LIMITS.maxScore} wees`,
    })
    @Max(REVIEW_LIMITS.maxScore, {
        message: `Elke telling moet tussen ${REVIEW_LIMITS.minScore} en ${REVIEW_LIMITS.maxScore} wees`,
    })
    score!: number;
}