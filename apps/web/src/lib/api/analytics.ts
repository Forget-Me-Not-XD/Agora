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

export interface AdminKpi {
    value: number;
    deltaPct: number | null;
}

export interface AdminKpis {
    totalEvents: AdminKpi;
    activeUsers: AdminKpi;
    newSignups: AdminKpi;
    totalRsvps: AdminKpi;
}

export interface RecentRsvp {
    id: string;
    eventTitle: string;
    userName: string;
    status: string;
    checkedIn: boolean;
    createdAt: string;
}

export async function getAdminKpis(): Promise <AdminKpis> {
    return apiFetch<AdminKpis>('/api/v1/analytics/admin-kpis');
}

export async function getRsvpsPerMonth(): Promise <EventsPerMonth[]> {
    return apiFetch<EventsPerMonth[]>('/api/v1/analytics/rsvps-per-month');
}

export async function getRecentRsvps(limit = 8): Promise<RecentRsvp[]> {
    return apiFetch<RecentRsvp[]>(`/api/v1/analytics/recent-rsvps?limit=${limit}`);
}

export interface RsvpStatusCount {
    status: string;
    count: number;
}

export async function getRsvpStatusBreakdown(): Promise<RsvpStatusCount[]> {
    return apiFetch<RsvpStatusCount[]>('/api/v1/analytics/rsvp-status-breakdown');
}

export interface BudgetPerMonth {
    year:  number;
    month: number;
    total: number;
}

export async function getBudgetPerMonth(): Promise<BudgetPerMonth[]> {
    return apiFetch<BudgetPerMonth[]>('/api/v1/analytics/budget-per-month');
}

export interface PredictionResult {
    predictedFillRate:   number;
    estimatedRsvps:      number;
    predictedNoShowRate: number;
    estimatedAttendees:  number;
    estimatedBudgetZAR:  number;
    reasoning:           string[];
}

// Thrown specifically on a 503, so callers can show a distinct "unavailable" state.
export class PredictionUnavailableError extends Error {}

export async function getAttendancePrediction(eventId: string): Promise<PredictionResult> {
    const token = getToken();

    const res = await fetch(`${BASE_URL}/api/v1/analytics/prediction?eventId=${encodeURIComponent(eventId)}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: 'no-store',
    });

    if (res.status === 503) {
        throw new PredictionUnavailableError('Prediction service unavailable');
    }

    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string | string[] };
        const msg  = body.message ?? res.statusText;
        throw new Error(`[${res.status}] ${typeof msg === 'string' ? msg : msg.join(', ')}`);
    }

    return res.json() as Promise<PredictionResult>;
}

export interface PredictDraftPayload {
    date:        string;
    maxCapacity: number;
}

export async function getDraftAttendancePrediction(payload: PredictDraftPayload): Promise<PredictionResult> {
    const token = getToken();

    const res = await fetch(`${BASE_URL}/api/v1/analytics/predict-draft`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
    });

    if (res.status === 503) {
        throw new PredictionUnavailableError('Prediction service unavailable');
    }

    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string | string[] };
        const msg  = body.message ?? res.statusText;
        throw new Error(`[${res.status}] ${typeof msg === 'string' ? msg : msg.join(', ')}`);
    }

    return res.json() as Promise<PredictionResult>;
}
