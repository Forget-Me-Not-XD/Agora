// ========== Imports: ==========
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { PaymentStatus } from '../schemas/payment.schema';

export class PayfastNotifyDto {
    @IsNotEmpty()
    @IsString()
    m_payment_id!: string;

    @IsNotEmpty()
    @IsString()
    pf_payment_id!: string;

    @IsNotEmpty()
    @IsIn(['COMPLETE', 'FAILED'])
    payment_status!: string;

    @IsNotEmpty()
    @IsString()
    item_name!: string;

    @IsNotEmpty()
    @IsString()
    amount_gross!: string;

    @IsNotEmpty()
    @IsString()
    signature!: string;
}

export class PayfastNotifyResultDto {
    status!: PaymentStatus;
}