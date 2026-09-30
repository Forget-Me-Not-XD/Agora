// ========== Imports: ==========
import { ArrayNotEmpty, IsArray, IsMongoId, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { RatingInputDto } from './rating-input.dto';
import { REVIEW_LIMITS } from '../../common/constants/review-categories';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateReviewDto {
    @IsMongoId({ message: 'eventId moet \'n geldige id wees' })
    eventId!: string;

    @IsArray({ message: 'ratings moet \'n lys wees' })
    @ArrayNotEmpty({ message: 'Gee ten minste een telling' })
    @ValidateNested({ each: true, message: 'Elke telling moet \'n categoryId en score hê' })
    @Type(() => RatingInputDto)
    ratings!: RatingInputDto[];

    @IsOptional()
    @Transform(trim)
    @IsString({ message: 'Kommentaar moet teks wees' })
    @MaxLength(REVIEW_LIMITS.maxCommentLength, {
        message: `Kommentaar mag hoogstens ${REVIEW_LIMITS.maxCommentLength} karakters wees`,
    })
    comment?: string;
}
