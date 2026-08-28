'use server';

// ========== Imports: ==========
import { createEvent, getEvents, updateEvent } from '@/lib/api/events';
import type { CreateEventPayload, Event, EventFilters, UpdateEventPayload } from '@/lib/api/events';

export interface CreateEventResult {
    id?:    string;
    error?: string;
}

export async function createEventAction(
    payload: CreateEventPayload,
): Promise<CreateEventResult> {
    try {
        const event = await createEvent(payload);
        return { id: event.id };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Geleentheid skep het misluk.' };
    }
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

export async function listEventsAction(filters?: EventFilters): Promise<ListEventsResult> {
    try {
        const events = await getEvents(filters);
        return { events };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Kon nie geleenthede laai nie.' };
    }
}