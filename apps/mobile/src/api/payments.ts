import { apiClient } from './client';

export interface PayfastCheckoutFields {
    merchant_id: string;
    merchant_key: string;
    return_url: string;
    cancel_url: string;
    notify_url: string;
    name_first: string;
    name_last: string;
    email_address: string;
    m_payment_id: string;
    amount: string;
    item_name: string;
    signature: string;
}

export interface SimulatedPayfastNotify {
    m_payment_id: string;
    pf_payment_id: string;
    payment_status: string;
    item_name: string;
    amount_gross: string;
    signature: string;
}

export interface InitiatePaymentResponse {
    paymentId: string;
    reference: string;
    amount: number;
    itemName: string;
    checkout: PayfastCheckoutFields;
    checkoutUrl: string;
    simulation: { success: SimulatedPayfastNotify; failed: SimulatedPayfastNotify } | null;
}

export interface PaymentNotifyResult {
    status: 'HANGENDE' | 'VOLTOOI' | 'MISLUK';
}

export async function initiatePayment(eventId: string): Promise<InitiatePaymentResponse> {
    return apiClient.post<InitiatePaymentResponse, { eventId: string }>('/payments/initiate', { eventId });
}

export async function notifyPayment(payload: SimulatedPayfastNotify): Promise<PaymentNotifyResult> {
    return apiClient.post<PaymentNotifyResult, SimulatedPayfastNotify>('/payments/notify', payload);
}
