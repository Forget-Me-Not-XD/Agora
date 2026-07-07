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

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    location!: string;

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
    @IsIn(ATTENDANCE_ROLES)
    intendedAttendance?: IntendedAttendance;
}