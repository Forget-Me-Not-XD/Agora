// ========== Imports: ==========
import { IsIn, IsMongoId, IsNotEmpty, IsOptional } from 'class-validator';

export type PaymentPlatform = 'web' | 'mobile';

export class InitiatePaymentDto {
    @IsNotEmpty()
    @IsMongoId()
    eventId !: string;

    @IsOptional()
    @IsIn(['web', 'mobile'])
    platform ?: PaymentPlatform;
}