'use server';

import { createRsvp, getRsvpQrDataUri } from '@/lib/api/rsvp';

export interface RsvpActionResult {
    qrDataUri?: string;
    error?:     string;
}

export async function rsvpToEventAction(eventId: string): Promise<RsvpActionResult> {
    try {
        const rsvp      = await createRsvp(eventId);
        const qrDataUri = await getRsvpQrDataUri(rsvp._id);
        return { qrDataUri };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Inskrywing het misluk.' };
    }
}