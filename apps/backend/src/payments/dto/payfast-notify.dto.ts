// ========== Imports: ==========
import { PaymentStatus } from '../schemas/payment.schema';

export interface PayfastNotifyDto {
    m_payment_id: string;
    pf_payment_id: string;
    payment_status: string;
    item_name: string;
    amount_gross: string;
    signature: string;
}

export interface PayfastNotifyResultDto {
    status: PaymentStatus;
}
