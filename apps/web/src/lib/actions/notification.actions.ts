'use server';

import { markNotificationRead } from '@/lib/api/notifications';

export async function markNotificationReadAction(id: string): Promise<{ error?: string }> {
    try {
        await markNotificationRead(id);
        return {};
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Kon nie kennisgewing as gelees merk nie.' };
    }
}