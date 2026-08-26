'use server';

import { initiatePayment, notifyPayment } from '@/lib/api/payments';
import type { InitiatePaymentResponse, SimulatedPayfastNotify } from '@/lib/api/payments';

export interface InitiatePaymentResult {
    payment?: InitiatePaymentResponse;
    error?:   string;
}

export async function initiatePaymentAction(eventId: string): Promise<InitiatePaymentResult> {
    try {
        const payment = await initiatePayment(eventId);
        return { payment };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Kon nie betaling begin nie.' };
    }
}

export interface ConfirmPaymentResult {
    success?: boolean;
    error?:   string;
}

export async function confirmPaymentAction(payload: SimulatedPayfastNotify): Promise<ConfirmPaymentResult> {
    try {
        const result = await notifyPayment(payload);
        return { success: result.status === 'VOLTOOI' };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Betaling kon nie bevestig word nie.' };
    }
}
