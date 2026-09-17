// ========== Imports: ==========
import { getToken } from '../session';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface PayfastCheckoutFields {
    merchant_id:  string;
    merchant_key: string;
    return_url:   string;
    cancel_url:   string;
    notify_url:   string;
    name_first:   string;
    name_last:    string;
    email_address: string;
    m_payment_id: string;
    amount:       string;
    item_name:    string;
    signature:    string;
}

export interface SimulatedPayfastNotify {
    m_payment_id:   string;
    pf_payment_id:  string;
    payment_status: string;
    item_name:      string;
    amount_gross:   string;
    signature:      string;
}

export interface InitiatePaymentResponse {
    paymentId:      string;
    reference:      string;
    amount:         number;
    itemName:       string;
    checkout:       PayfastCheckoutFields;
    checkoutUrl:    string;
    simulation: { success: SimulatedPayfastNotify; failed: SimulatedPayfastNotify } | null;
}

export interface PaymentNotifyResult {
    status: 'HANGENDE' | 'VOLTOOI' | 'MISLUK';
}

export interface PaymentStatusResult {
    status: 'HANGENDE' | 'VOLTOOI' | 'MISLUK';
    rsvpId: string | null;
}

async function throwHttpError(res: Response): Promise<never> {
    const body = await res.json().catch(() => ({})) as { message?: string | string[] };
    const msg  = body.message ?? res.statusText;
    throw new Error(`[${res.status}] ${typeof msg === 'string' ? msg : msg.join(', ')}`);
}

export async function initiatePayment(eventId: string): Promise<InitiatePaymentResponse> {
    const token = getToken();

    const res = await fetch(`${BASE_URL}/api/v1/payments/initiate`, {
        method:  'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body:  JSON.stringify({ eventId, platform: 'web' }),
        cache: 'no-store',
    });

    if (!res.ok) await throwHttpError(res);
    return res.json() as Promise<InitiatePaymentResponse>;
}

export async function notifyPayment(payload: SimulatedPayfastNotify): Promise<PaymentNotifyResult> {
    const res = await fetch(`${BASE_URL}/api/v1/payments/notify`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
        cache:   'no-store',
    });

    if (!res.ok) await throwHttpError(res);
    return res.json() as Promise<PaymentNotifyResult>;
}

// PayFast se ITN skep die kaartjie server-tot-server, heeltemal onafhanklik van
// wanneer die blaaier na ons /payments/return herlei (sien die kommentaar
// daaroor in payments.controller.ts). Word gepeil ná 'n suksesvolle herleiding
// totdat status regtig VOLTOOI is, i.p.v. om net op die herleiding te vertrou.
export async function getPaymentStatus(reference: string): Promise<PaymentStatusResult> {
    const token = getToken();

    const res = await fetch(`${BASE_URL}/api/v1/payments/${encodeURIComponent(reference)}/status`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        cache:   'no-store',
    });

    if (!res.ok) await throwHttpError(res);
    return res.json() as Promise<PaymentStatusResult>;
}
