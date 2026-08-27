// ========== Imports: ==========
import { IsMongoId, IsNotEmpty } from 'class-validator';

export class InitiatePaymentDto {
    @IsNotEmpty()
    @IsMongoId()
    eventId !: string;
}