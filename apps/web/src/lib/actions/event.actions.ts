'use server';

// ========== Imports: ==========
import { redirect } from 'next/navigation';
import { createEvent } from '@/lib/api/events';
import type { CreateEventPayload } from '@/lib/api/events';

export async function createEventAction(
    payload: CreateEventPayload,
): Promise<string | null> {
    try {
        await createEvent(payload);
    } catch (err) {
        return err instanceof Error ? err.message : 'Geleentheid skep het misluk.';
    }
    redirect('/events');
}