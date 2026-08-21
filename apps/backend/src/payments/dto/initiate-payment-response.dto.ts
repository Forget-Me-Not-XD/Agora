export interface PayfastCheckoutFieldsDto {
    merchant_id:    string;
    merchant_key:   string;
    return_url:     string;
    cancel_url:     string;
    notify_url:     string;
    m_payment_id:   string;
    amount:         string;
    item_name:      string;
    signature:      string;
}

export interface SimulatedPayfastNotifyDto {
    m_payment_id:   string;
    pf_payment_id:  string;
    payment_status: string;
    item_name:      string;
    amount_gross:   string;
    signature:      string;
}

export class InitiatePaymentResponseDto {
    paymentId!:     string;
    reference!:     string;
    amount!:        number;
    itemName!:      string;
    checkout!:      PayfastCheckoutFieldsDto;
    checkoutUrl!:   string;
    simulation!:    { success: SimulatedPayfastNotifyDto; failed: SimulatedPayfastNotifyDto } | null;
}