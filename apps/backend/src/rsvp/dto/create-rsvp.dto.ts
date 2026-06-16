// ========== Imports: ==========
import { IsMongoId, IsNotEmpty } from 'class-validator';

export class CreateRsvpDto {
    @IsNotEmpty()
    @IsMongoId()
    eventId!: string;
}