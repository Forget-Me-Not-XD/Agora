// ========== Imports: ==========
import { getToken } from '../session';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface RsvpPerEvent {
    eventTitle: string;
    totalRsvps: number;
}

export interface EventsPerMonth {
    year:  number;
    month: number;
    count: number;
}

export interface RsvpSummary {
    rsvpsPerEvent:   RsvpPerEvent[];
    averageFillRate: number;
}

export interface EventsSummary {
    eventsPerMonth: EventsPerMonth[];
    top5Events:     RsvpPerEvent[];
}

async function apiFetch<T>(path: string): Promise<T> {
    const token = getToken();

    const res = await fetch(`${BASE_URL}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: 'no-store',
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string | string[] };
        const msg  = body.message ?? res.statusText;
        throw new Error(`[${res.status}] ${typeof msg === 'string' ? msg : msg.join(', ')}`);
    }

    return res.json() as Promise<T>;
}

export async function getRsvpSummary(): Promise<RsvpSummary> {
    return apiFetch<RsvpSummary>('/api/v1/analytics/rsvp-summary');
}

export async function getEventsSummary(): Promise<EventsSummary> {
    return apiFetch<EventsSummary>('/api/v1/analytics/events-summary');
}
