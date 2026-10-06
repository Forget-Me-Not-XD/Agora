'use client';

// ========== Imports: ==========
import { useEffect } from 'react';
import { Bell, BellRing } from 'lucide-react';
import type { NotificationItem } from '@/lib/api/notifications';
import { formatDateLong } from '@/lib/format-date';
import { useNotificationsStore, useOpenNotification } from '@/lib/stores/notifications.store';

/**
 * Die bediener se lys tot die store gelaai is, daarna die store. So wys die eerste render
 * reeds data, en verander die lys saam wanneer die klokkie poll of iets as gelees merk.
 */
function useNotificationItems(initial: NotificationItem[]): NotificationItem[] {
    const items   = useNotificationsStore((s) => s.items);
    const loaded  = useNotificationsStore((s) => s.loaded);
    const hydrate = useNotificationsStore((s) => s.hydrate);

    useEffect(() => {
        hydrate(initial);
    }, [initial, hydrate]);

    return loaded ? items : initial;
}

export function NotificationsUnreadSummary({ initial }: { initial: NotificationItem[] }) {
    const unreadCount = useNotificationItems(initial).filter((n) => !n.read).length;

    return <>{unreadCount > 0 ? `${unreadCount} ongelees` : 'Alles gelees'}</>;
}

export default function NotificationsList({ initial }: { initial: NotificationItem[] }) {
    const items = useNotificationItems(initial);
    const error = useNotificationsStore((s) => s.error);
    const openNotification = useOpenNotification();

    if (items.length === 0) {
        return (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-10 text-center">
                <p className="text-[var(--color-text-subtle)] text-sm">Geen kennisgewings nie</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {error && (
                <p className="text-sm text-[var(--color-red)]">{error}</p>
            )}
            {items.map((item) => (
                <button
                    key={item._id}
                    onClick={() => void openNotification(item)}
                    className={[
                        'w-full text-left flex items-start gap-3 bg-[var(--color-surface)] border rounded-2xl p-4 transition-colors hover:border-[var(--color-primary)]',
                        item.read ? 'border-[var(--color-border)]' : 'border-[var(--color-primary)]',
                    ].join(' ')}
                >
                    <div className="mt-0.5 shrink-0">
                        {item.read ? (
                            <Bell size={18} className="text-[var(--color-text-subtle)]" />
                        ) : (
                            <BellRing size={18} className="text-[var(--color-primary)]" />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className={['text-sm text-[var(--color-text)]', item.read ? 'font-normal' : 'font-semibold'].join(' ')}>
                            {item.message}
                        </p>
                        <p className="text-xs text-[var(--color-text-subtle)] mt-1">
                            {formatDateLong(item.createdAt)}
                        </p>
                    </div>
                    {!item.read && (
                        <span className="shrink-0 mt-1.5 w-2 h-2 rounded-full bg-[var(--color-primary)]" />
                    )}
                </button>
            ))}
        </div>
    );
}
