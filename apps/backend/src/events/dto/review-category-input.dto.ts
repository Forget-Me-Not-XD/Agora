// ========== Imports: ==========
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { REVIEW_CATEGORY_LIMITS } from '../../common/constants/review-categories';

const trim = ({ value }: { value: unknown}) => (typeof value === 'string' ? value.trim() : value);

export class ReviewCategoryInputDto {
    @IsOptional()
    @IsUUID('4', { message: 'Kategorie-id moet \'n geldige UUID wees' })
    id?: string;

    @Transform(trim)
    @IsString({ message: 'Kategorienaam moet teks wees' })
    @Length(REVIEW_CATEGORY_LIMITS.minNameLength, REVIEW_CATEGORY_LIMITS.maxNameLength, {
        message: `Elke kategorienaam moet tussen ${REVIEW_CATEGORY_LIMITS.minNameLength} en ${REVIEW_CATEGORY_LIMITS.maxNameLength} karakters wees.`,
    })
    name!: string;
}