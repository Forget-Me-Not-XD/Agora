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
    IsEnum,
} from 'class-validator';
import { Role } from '../../common/enums/role.enums';
import { EventType } from '../../common/enums/event-type.enum';
import { ATTENDANCE_ROLES } from '../../common/rbac/event-visibility';

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