import { apiClient } from "./client";

export interface NotificationItem {
    _id:        string;
    message:    string;
    read:       boolean;
    createdAt:  string;
}

// Haal die aangemelde gebruiker se kennisgewings (nuutste eerste)
export async function getMyNotifications(): Promise<NotificationItem[]> {
    return apiClient.get<NotificationItem[]>('/notifications/my');
}

// Merk 'n kennisgewing as gelees, gee die opgedateerde kennisgewing terug
export async function markNotificationRead(id: string): Promise<NotificationItem> {
    return apiClient.patch<NotificationItem>(`/notifications/${id}/read`);
}