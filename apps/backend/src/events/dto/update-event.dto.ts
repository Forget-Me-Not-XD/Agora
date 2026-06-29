// ========== Imports: ==========
import {
    IsString,
    IsNotEmpty,
    IsDateString,
    IsInt,
    IsOptional,
    IsArray,
    IsMongoId,
    MaxLength,
    Min,
    IsIn,
} from 'class-validator';
import { Role } from '../../common/enums/role.enums';
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
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    location?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    maxCapacity?: number;

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
}