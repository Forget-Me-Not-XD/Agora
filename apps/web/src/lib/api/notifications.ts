import { getToken } from '../session';
import { httpErrorMessage } from './http-error';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface NotificationEvent {
    _id:   string;
    title: string;
}

export interface NotificationItem {
    _id:       string;
    message:   string;
    read:      boolean;
    event:     NotificationEvent | null;
    createdAt: string;
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
        throw new Error(httpErrorMessage(res, body));
    }

    return res.json() as Promise<T>;
}

// GET /api/v1/notifications/my — nuutste eerste (backend sorteer reeds)
export async function getMyNotifications(): Promise<NotificationItem[]> {
    return apiFetch<NotificationItem[]>('/api/v1/notifications/my');
}

export async function markNotificationRead(id: string): Promise<NotificationItem> {
    return apiFetch<NotificationItem>(`/api/v1/notifications/${id}/read`, {
        method: 'PATCH',
    });
}