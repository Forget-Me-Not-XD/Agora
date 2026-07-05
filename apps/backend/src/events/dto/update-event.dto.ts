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
    MaxLength,
    Min,
    IsIn,
    IsEnum,
} from 'class-validator';
import { Role } from '../../common/enums/role.enums';
import { EventType } from '../../common/enums/event-type.enum';
import { ATTENDANCE_ROLES } from '../../common/rbac/event-visibility';

export class UpdateEventDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    title?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(2000)
    description?: string;

    @IsOptional()
    @IsDateString()
    date?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    location?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    maxCapacity?: number;

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
    @IsIn(ATTENDANCE_ROLES)
    intendedAttendance?: Role;

    @IsOptional()
    @IsEnum(EventType)
    type?: EventType;
}