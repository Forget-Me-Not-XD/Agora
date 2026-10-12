// ========== Imports: ==========
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { create } from 'zustand';
import { listNotificationsAction, markNotificationReadAction } from '@/lib/actions/notification.actions';
import type { NotificationItem } from '@/lib/api/notifications';

/**
 * Een lys kennisgewings vir die hele bladsy. Werk soos apps/mobile/src/stores/notifications.store.ts.
 *
 * Die klokkie in die header en die /notifications-bladsy lees albei hiervandaan. Merk jy 'n
 * kennisgewing op die een plek as gelees, verander die ander een dadelik saam.
 */
interface NotificationsState {
    items:  NotificationItem[];
    /** Is daar al ten minste een keer data gelaai (deur die klokkie of die bladsy)? */
    loaded: boolean;
    error:  string | null;

    load:     () => Promise<void>;
    /** Gebruik data wat die bediener reeds gelaai het, sodat ons nie weer hoef te vra nie. */
    hydrate:  (items: NotificationItem[]) => void;
    /**
     * Gee false terug as die API-versoek misluk het. Bestaan die kennisgewing nie meer nie, verdwyn
     * dit net uit die lys, en dit tel nie as 'n mislukking nie.
     */
    markRead: (id: string) => Promise<boolean>;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
    items:  [],
    loaded: false,
    error:  null,

    load: async () => {
        const result = await listNotificationsAction();
        if (result.notifications) {
            set({ items: result.notifications, loaded: true, error: null });
        } else if (result.error) {
            // Hou die vorige lys, sodat een mislukte poll nie alles laat verdwyn nie
            set({ error: result.error });
        }
    },

    hydrate: (items) => set({ items, loaded: true, error: null }),

    markRead: async (id) => {
        const target = get().items.find((n) => n._id === id);
        if (!target || target.read) return true;

        // Optimisties: merk dadelik, en keer terug as die API nee sê
        set((s) => ({ items: s.items.map((n) => (n._id === id ? { ...n, read: true } : n)) }));

        const result = await markNotificationReadAction(id);
        if (result.gone) {
            // Intussen verwyder, byvoorbeeld 'n resensieversoek wat op 'n ander toestel beantwoord is.
            // Dit is nie 'n fout nie: haal dit net uit die lys, en laat die klik voortgaan.
            set((s) => ({ items: s.items.filter((n) => n._id !== id), error: null }));
            return true;
        }
        if (result.error) {
            set((s) => ({
                items: s.items.map((n) => (n._id === id ? { ...n, read: false } : n)),
                error: result.error ?? null,
            }));
            return false;
        }

        set({ error: null });
        return true;
    },
}));

export function selectUnreadCount(state: NotificationsState): number {
    return state.items.filter((n) => !n.read).length;
}

/**
 * Wat gebeur as iemand op 'n kennisgewing klik: merk dit as gelees en gaan na die geleentheid
 * toe. 'n Resensieversoek maak eerder die resensie oop (as 'n modal bo-oor die huidige bladsy).
 * Is die geleentheid verwyder (event is null), word dit net as gelees gemerk.
 * Gee false terug as die merk misluk het; dan bly ons op dieselfde plek.
 */
export function useOpenNotification(): (item: NotificationItem) => Promise<boolean> {
    const router   = useRouter();
    const markRead = useNotificationsStore((s) => s.markRead);

    return useCallback(async (item: NotificationItem) => {
        const ok = await markRead(item._id);
        if (!ok) return false;

        if (item.event) {
            router.push(item.type === 'RESENSIE_VERSOEK' ? `/reviews/${item.event._id}` : `/events/${item.event._id}`);
        }
        return true;
    }, [markRead, router]);
}
