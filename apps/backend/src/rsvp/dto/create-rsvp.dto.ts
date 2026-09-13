// ========== Imports: ==========
import { IsMongoId, IsNotEmpty, IsString, IsEmail, MaxLength, ValidateIf } from 'class-validator';

export class CreateRsvpDto {
    @IsNotEmpty()
    @IsMongoId()
    eventId!: string;

    @ValidateIf((dto: CreateRsvpDto) => !!dto.plusOneSurname || !!dto.plusOneEmail)
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    plusOneName?: string;

    @ValidateIf((dto: CreateRsvpDto) => !!dto.plusOneName || !!dto.plusOneEmail)
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    plusOneSurname?: string;

    @ValidateIf((dto: CreateRsvpDto) => !!dto.plusOneName || !!dto.plusOneSurname)
    @IsEmail()
    plusOneEmail?: string;

}