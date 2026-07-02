'use server';

import { getPhotographers, assignPhotographer, Photographer } from "../api/photographer";

export async function searchPhotographersAction(
    q?: string,
): Promise<{ photographers?: Photographer[]; error?: string }> {
    try {
        const photographers = await getPhotographers(q);
        return { photographers };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Kon nie fotograwe soek nie.' };
    }
}

export async function assignPhotographerAction(
    eventId: string,
    photographerId: string,
    brief: string,
): Promise<{ error?: string }> {
    try {
        await assignPhotographer(eventId, photographerId, brief);
        return {};
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Kon nie fotograaf toeken nie.'};
    }
}