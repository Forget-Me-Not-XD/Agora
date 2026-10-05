// ========== Imports: ==========
import {
    IsString,
    IsNotEmpty,
    IsDateString,
    IsInt,
    IsNumber,
    IsOptional,
    IsArray,
    IsMongoId,
    IsBoolean,
    MaxLength,
    Min,
    IsIn,
    IsEnum,
    ValidateIf,
    ArrayMinSize,
    ArrayMaxSize,
    ValidateNested,
} from 'class-validator';
import { Role } from '../../common/enums/role.enums';
import { EventType } from '../../common/enums/event-type.enum';
import { ATTENDANCE_ROLES } from '../../common/rbac/event-visibility';
import { Type } from 'class-transformer';
import { ReviewCategoryInputDto } from './review-category-input.dto';
import { REVIEW_CATEGORY_LIMITS } from '../../common/constants/review-categories';

export class CreateEventDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    title!: string;
    
    @IsString()
    @IsNotEmpty()
    @MaxLength(2000)
    description!: string;

    @IsDateString()
    date!: string;

    // Ou geleenthede het dalk nie een nie, maar elke nuwe geleentheid moet 'n eindtyd hê
    @IsDateString({}, { message: 'Gee \'n geldige eind-datum' })
    endDate!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    location!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    address!: string;

    @IsOptional()
    @IsString()
    placeId?: string;

    @IsOptional()
    @IsNumber()
    lat?: number;

    @IsOptional()
    @IsNumber()
    lon?: number;

    @IsInt()
    @Min(1)
    maxCapacity!: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    budget?: number;

    @IsOptional()
    @IsArray()
    @IsMongoId ({ each: true })
    photographers?: string[];

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    photographerInstructions?: string;

    @IsOptional()
    @IsMongoId()
    assignedTo?: string;

    @IsOptional()
    @IsIn(ATTENDANCE_ROLES)
    intendedAttendance?: Role;

    @IsOptional()
    @IsEnum(EventType)
    type?: EventType;

    @IsOptional()
    @IsBoolean()
    sellsTickets?: boolean;

    @ValidateIf((dto: CreateEventDto) => dto.sellsTickets === true)
    @IsNumber()
    @Min(0.01)
    ticketPrice?: number;

    @ValidateIf((dto: CreateEventDto) => dto.sellsTickets === true)
    @IsInt()
    @Min(1)
    ticketsAvailable?: number;

    @IsOptional()
    @IsBoolean()
    allowsPlusOne?: boolean;

    @IsOptional()
    @IsArray({ message: 'reviewCategories moet \'n lys wees' })
    @ArrayMinSize(REVIEW_CATEGORY_LIMITS.minCount, {
        message: `Kies ten minste ${REVIEW_CATEGORY_LIMITS.minCount} resensie-kategorie`,
    })
    @ArrayMaxSize(REVIEW_CATEGORY_LIMITS.maxCount, {
        message: `Jy mag hoogstens ${REVIEW_CATEGORY_LIMITS.maxCount} resensie-kategorieë hê`,
    })
    @ValidateNested({ each: true, message: 'Elke resensie-kategorie moet \'n naam hê' })
    @Type(() => ReviewCategoryInputDto)
    reviewCategories?: ReviewCategoryInputDto[];
}