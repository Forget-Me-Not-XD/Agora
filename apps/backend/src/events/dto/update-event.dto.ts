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
} from 'class-validator';
import { ATTENDANCE_ROLES, IntendedAttendance } from '../../common/rbac/event-visibility';

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
    intendedAttendance?: IntendedAttendance;
}