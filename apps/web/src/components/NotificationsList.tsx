'use client';

// ========== Imports: ==========
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, BellRing } from 'lucide-react';
import type { NotificationItem } from '@/lib/api/notifications';
import { markNotificationReadAction } from '@/lib/actions/notification.actions';
import { formatDateLong } from '@/lib/format-date';

export default function NotificationsList({ initial }: { initial: NotificationItem[] }) {
    const [items, setItems] = useState(initial);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        setItems(initial);
    }, [initial]);

    async function handleClick(item: NotificationItem) {
        if (!item.read) {
            setItems((prev) => prev.map((n) => (n._id === item._id ? { ...n, read: true } : n)));
            const result = await markNotificationReadAction(item._id);
            if (result.error) {
                setItems((prev) => prev.map((n) => (n._id === item._id ? { ...n, read: false } : n)));
                setError(result.error);
                return;
            }
        }
        if (item.event) {
            router.push(`/events/${item.event._id}`);
        }
    }

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
                    onClick={() => void handleClick(item)}
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