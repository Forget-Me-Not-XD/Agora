import { create } from 'zustand';
import { NotificationItem, getMyNotifications, markNotificationRead } from '../api/notifications';
import { getErrorMessage, getErrorStatus } from '../lib/errors';

interface NotificationsState {
    items: NotificationItem[];
    unreadCount: number;
    isLoading: boolean;
    error: string | null;

    load: () => Promise<void>;
    markRead: (id: string) => Promise<void>;
    reset: () => void;
}

// Elke reset (afmelding) begin 'n nuwe generasie. 'n Laai of merk wat nog besig was toe iemand
// afgemeld het, mag dan nie die vorige gebruiker se kennisgewings of telling terugskryf nie.
let generation = 0;

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
    items: [],
    unreadCount: 0,
    isLoading: false,
    error: null,

    load: async () => {
        const started = generation;
        set({ isLoading: true, error: null });
        try {
            const items = await getMyNotifications();
            if (started !== generation) return;
            set({
                items,
                unreadCount: items.filter((n) => !n.read).length,
                isLoading: false,
            });
        } catch (err) {
            if (started !== generation) return;
            set({
                error: getErrorMessage(err, 'Kon nie kennisgewings laai nie'),
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

        const started = generation;
        try {
            await markNotificationRead(id);
        } catch (err) {
            if (started !== generation) return;

            if (getErrorStatus(err) === 404) {
                // Intussen verwyder, byvoorbeeld 'n resensieversoek wat op 'n ander toestel beantwoord
                // is. Haal dit net uit die lys in plaas daarvan om dit weer ongelees te maak.
                const items = get().items.filter((n) => n._id !== id);
                set({ items, unreadCount: items.filter((n) => !n.read).length });
                return;
            }

            // Misluk -> keer probeer terug
            set({
                items: get().items.map((n) => (n._id === id ? { ...n,read: false} : n)),
                unreadCount: get().unreadCount + 1,
            });
        }
    },

    reset: () => {
        generation += 1;
        set({ items: [], unreadCount: 0, isLoading: false, error: null });
    },
}));