import { getToken } from '../session';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface Photographer {
    id:      string;
    name:    string;
    surname: string;
    email:   string;
}

// GET /api/v1/users?role=PHOTOGRAPHER&q=<soek>
async function throwHttpError(res: Response): Promise<never> {
    const body = await res.json().catch(() => ({})) as { message?: string | string[] };
    const msg = body.message ?? res.statusText;
    throw new Error(`[${res.status}] ${typeof msg === 'string' ? msg : msg.join(', ')}`);
}

export async function getPhotographers(q?: string): Promise<Photographer[]> {
    const token = getToken();

    const params = new URLSearchParams({ role: 'PHOTOGRAPHER' });
    if (q && q.trim()) params.set('q', q.trim());

    const res = await fetch(`${BASE_URL}/api/v1/users?${params.toString()}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        cache:   'no-store',
    });

    if (!res.ok) await throwHttpError(res);
    return res.json() as Promise<Photographer[]>;
}

// GET /api/v1/users?role=PHOTOGRAPHER&ids=<id,id> (soek fotograaf op ID)
export async function getPhotographersByIds(ids: string[]): Promise<Photographer[]> {
    if (!ids.length) return [];
    const token = getToken();
    const params = new URLSearchParams({ role: 'PHOTOGRAPHER', ids: ids.join(',') });
    const res = await fetch(`${BASE_URL}/api/v1/users?${params.toString()}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        cache: 'no-store',
    });
    if (!res.ok) await throwHttpError(res);
    return res.json() as Promise<Photographer[]>;
}

// PATCH /api/v1/events/:id/assign-photographer
export async function assignPhotographer(
    eventId: string,
    photographerId: string,
    brief: string,
): Promise<void> {
    const token = getToken();

    const res = await fetch(`${BASE_URL}/api/v1/events/${eventId}/assign-photographer`, {
        method:  'PATCH',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body:  JSON.stringify({ photographerId, brief }),
        cache: 'no-store',
    });

    if (!res.ok) await throwHttpError(res);
}