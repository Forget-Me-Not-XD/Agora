// ========== Imports: ==========
import { IsMongoId, IsNotEmpty, IsString, IsEmail, MaxLength, ValidateIf } from 'class-validator';

function hasAnyPlusOneField(dto: CreateRsvpDto): boolean {
    return !!(dto.plusOneName || dto.plusOneSurname || dto.plusOneEmail);
}

export class CreateRsvpDto {
    @IsNotEmpty()
    @IsMongoId()
    eventId!: string;

    @ValidateIf(hasAnyPlusOneField)
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    plusOneName?: string;

    @ValidateIf(hasAnyPlusOneField)
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    plusOneSurname?: string;

    @ValidateIf(hasAnyPlusOneField)
    @IsEmail()
    plusOneEmail?: string;
}