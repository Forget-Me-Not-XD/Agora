'use server';

import { getMyNotifications, markNotificationRead } from '@/lib/api/notifications';
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

export async function markNotificationReadAction(id: string): Promise<{ error?: string }> {
    try {
        await markNotificationRead(id);
        return {};
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Kon nie kennisgewing as gelees merk nie.' };
    }
}