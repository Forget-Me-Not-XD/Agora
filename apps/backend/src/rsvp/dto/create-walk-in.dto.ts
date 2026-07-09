// ========== Imports: ==========
import { IsMongoId, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateWalkInDto {
    @IsNotEmpty()
    @IsMongoId()
    eventId!: string;

    @IsNotEmpty()
    @IsString()
    @MaxLength(120)
    guestName!: string;
}
