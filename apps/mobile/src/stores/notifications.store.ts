import { create } from 'zustand';
import { NotificationItem, getMyNotifications, markNotificationRead } from '../api/notifications';

interface NotificationsState {
    items: NotificationItem[];
    unreadCount: number;
    isLoading: boolean;
    error: string | null;

    load: () => Promise<void>;
    markRead: (id: string) => Promise<void>;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
    items: [],
    unreadCount: 0,
    isLoading: false,
    error: null,

    load: async () => {
        set({ isLoading: true, error: null });
        try {
            const items = await getMyNotifications();
            set({
                items,
                unreadCount: items.filter((n) => !n.read).length,
                isLoading: false,
            });
        } catch (err: any) {
            const msg = err?.response?.data?.message ?? 'Kon nie kennisgewings laai nie';
            set({
                error: typeof msg === 'string' ? msg : msg.join?.(', ') ?? 'Kon nie kennisgewings laai nie',
                isLoading: false,
            });
        }
    },

    markRead: async (id) => {
        const target = get().items.find((n) => n._id === id);
        if (!target || target.read) return; // reeds gelees/bestaan nie -> doen niks

        // mark plaaslik en verminder kenteken
        set({
            items: get().items.map((n) => (n._id === id ? { ...n, read: true } : n)),
            unreadCount: Math.max(0, get().unreadCount - 1),
        });

        try {
            await markNotificationRead(id);
        } catch {
            // Misluk -> keer probeer terug
            set({
                items: get().items.map((n) => (n._id === id ? { ...n,read: false} : n)),
                unreadCount: get().unreadCount + 1,
            });
        }
    },
}));