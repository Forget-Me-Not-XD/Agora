'use server';

// ========== Imports: ==========
import { getMyNotifications, markNotificationRead, NotificationApiError } from '@/lib/api/notifications';
import type { NotificationItem } from '@/lib/api/notifications';

export interface ListNotificationsResult {
    notifications?: NotificationItem[];
    error?:         string;
}

export async function listNotificationsAction(): Promise<ListNotificationsResult> {
    try {
        const notifications = await getMyNotifications();
        return { notifications };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Kon nie kennisgewings laai nie.' };
    }
}

export interface MarkNotificationReadResult {
    error?: string;
    // Die kennisgewing bestaan nie meer nie, soos 'n resensieversoek nadat die resensie elders gegee is
    gone?:  boolean;
}

export async function markNotificationReadAction(id: string): Promise<MarkNotificationReadResult> {
    try {
        await markNotificationRead(id);
        return {};
    } catch (err) {
        if (err instanceof NotificationApiError && err.status === 404) return { gone: true };
        return { error: err instanceof Error ? err.message : 'Kon nie kennisgewing as gelees merk nie.' };
    }
}
