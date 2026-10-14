import { PaymentStatus } from '../schemas/payment.schema';

export class PaymentStatusResponseDto {
    status!:  PaymentStatus;
    rsvpId!:  string | null;
}
