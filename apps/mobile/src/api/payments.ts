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

export interface PaymentStatusResult {
    status: 'HANGENDE' | 'VOLTOOI' | 'MISLUK';
    rsvpId: string | null;
}

export async function initiatePayment(eventId: string): Promise<InitiatePaymentResponse> {
    return apiClient.post<InitiatePaymentResponse, { eventId: string; platform: 'mobile' }>(
        '/payments/initiate',
        { eventId, platform: 'mobile' },
    );
}

export async function notifyPayment(payload: SimulatedPayfastNotify): Promise<PaymentNotifyResult> {
    return apiClient.post<PaymentNotifyResult, SimulatedPayfastNotify>('/payments/notify', payload);
}

// PayFast se ITN bevestig die kaartjie server-tot-server, onafhanklik van
// wanneer die blaaier na ons /payments/return herlei -- sien die kommentaar
// daaroor in payments.controller.ts. Word gepeil ná 'n suksesvolle herleiding
// totdat status regtig VOLTOOI is, i.p.v. om net op die herleiding te vertrou.
export async function getPaymentStatus(reference: string): Promise<PaymentStatusResult> {
    return apiClient.get<PaymentStatusResult>(`/payments/${reference}/status`);
}
