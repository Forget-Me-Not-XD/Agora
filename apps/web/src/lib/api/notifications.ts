// ========== Imports: ==========
import { getToken } from '../session';
import { httpErrorMessage } from './http-error';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export type NotificationType = 'FOTOGRAAF' | 'RESENSIE_VERSOEK';

export interface NotificationEvent {
    _id:   string;
    title: string;
}

export interface NotificationItem {
    _id:       string;
    message:   string;
    read:      boolean;
    event:     NotificationEvent | null;
    type:      NotificationType;
    createdAt: string;
}

// Hou die statuskode by: 'n 404 beteken die kennisgewing bestaan nie meer nie, en die action hanteer
// dit anders as 'n gewone fout
export class NotificationApiError extends Error {
    constructor(message: string, readonly status: number) {
        super(message);
    }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const token = getToken();

    const res = await fetch(`${BASE_URL}${path}`, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: 'no-store',
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string | string[] };
        throw new NotificationApiError(httpErrorMessage(res, body), res.status);
    }

    return res.json() as Promise<T>;
}

export async function getMyNotifications(): Promise<NotificationItem[]> {
    return apiFetch<NotificationItem[]>('/api/v1/notifications/my');
}

export async function markNotificationRead(id: string): Promise<NotificationItem> {
    return apiFetch<NotificationItem>(`/api/v1/notifications/${id}/read`, {
        method: 'PATCH',
    });
}
