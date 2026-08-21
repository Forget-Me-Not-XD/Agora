// ========== Imports: ==========
import { getToken } from '../session';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface PayfastCheckoutFields {
    merchant_id:  string;
    merchant_key: string;
    return_url:   string;
    cancel_url:   string;
    notify_url:   string;
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
        body:  JSON.stringify({ eventId }),
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
