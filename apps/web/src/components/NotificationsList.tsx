'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, BellRing } from 'lucide-react';
import type { NotificationItem } from '@/lib/api/notifications';
import { markNotificationReadAction } from '@/lib/actions/notification.actions';
import { formatDateLong } from '@/lib/format-date';

export default function NotificationsList({ initial }: { initial: NotificationItem[] }) {
    const [items, setItems] = useState(initial);
    const [, startTransition] = useTransition();
    const router = useRouter();

    function handleClick(item: NotificationItem) {
        if (!item.read) {
            setItems((prev) => prev.map((n) => (n._id === item._id ? { ...n, read: true } : n)));
            startTransition(async () => {
                await markNotificationReadAction(item._id);
            });
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
        <div className="space-y-4">
            {items.map((item) => (
                <button
                    key={item._id}
                    onClick={() => handleClick(item)}
                    className={[
                        'w-full text-left bg-[var(--color-surface)] border rounded-2xl p-5 transition-colors hover:border-[var(--color-primary)]',
                        item.read
                            ? 'border-[var(--color-border)]'
                            : 'border-[var(--color-primary)]',
                    ].join(' ')}
                >
                    <div className="flex items-start gap-3">
                        {/* Notification icon */}
                        <div className="mt-0.5 shrink-0">
                            {item.read ? (
                                <Bell
                                    size={19}
                                    className="text-[var(--color-text-subtle)]"
                                />
                            ) : (
                                <BellRing
                                    size={19}
                                    className="text-[var(--color-primary)]"
                                />
                            )}
                        </div>

                        <div className="min-w-0 flex-1">
                            {/* Event name */}
                            <div className="flex items-center justify-between gap-3">
                                <h3
                                    className={[
                                        'text-base text-[var(--color-text)]',
                                        item.read
                                            ? 'font-semibold'
                                            : 'font-bold',
                                    ].join(' ')}
                                >
                                    {item.event?.title ?? 'Kennisgewing'}
                                </h3>

                                {!item.read && (
                                    <span className="shrink-0 w-2.5 h-2.5 rounded-full bg-[var(--color-primary)]" />
                                )}
                            </div>

                            {/* Notification information box */}
                            <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3">
                                <p className="text-sm leading-6 text-[var(--color-text-subtle)]">
                                    {item.message}
                                </p>
                            </div>

                            {/* Date */}
                            <p className="text-xs text-[var(--color-text-subtle)] mt-3">
                                {'Kennisgewing gestuur op ' + formatDateLong(item.createdAt)}
                            </p>
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}