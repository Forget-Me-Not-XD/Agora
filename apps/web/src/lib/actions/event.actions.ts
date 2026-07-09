'use server';

// ========== Imports: ==========
import { createEvent, getEvents, updateEvent } from '@/lib/api/events';
import type { CreateEventPayload, Event, UpdateEventPayload } from '@/lib/api/events';

export async function createEventAction(
    payload: CreateEventPayload,
): Promise<string | null> {
    try {
        await createEvent(payload);
    } catch (err) {
        return err instanceof Error ? err.message : 'Geleentheid skep het misluk.';
    }
    return null;
}

export async function updateEventAction(
    id: string,
    payload: UpdateEventPayload,
): Promise<string | null> {
    try {
        await updateEvent(id, payload);
    } catch (err) {
        return err instanceof Error ? err.message : 'Geleentheid opdateer het misluk.';
    }
    return null;
}

export interface ListEventsResult {
    events?: Event[];
    error?:  string;
}

export async function listEventsAction(): Promise<ListEventsResult> {
    try {
        const events = await getEvents();
        return { events };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Kon nie geleenthede laai nie.' };
    }
}