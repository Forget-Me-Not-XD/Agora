'use client';

// ========== Imports: ==========
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, BellRing } from 'lucide-react';
import { usePollWhileActive } from '@/lib/user-activity';
import { formatDateShort } from '@/lib/format-date';
import { selectUnreadCount, useNotificationsStore, useOpenNotification } from '@/lib/stores/notifications.store';
import type { NotificationItem } from '@/lib/api/notifications';

const POLL_INTERVAL = 60000;

// Die popover wys net die nuutste paar; "Sien alles" gaan na die volle bladsy
const POPOVER_LIMIT = 8;

export default function NotificationBell() {
    const items       = useNotificationsStore((s) => s.items);
    const loaded      = useNotificationsStore((s) => s.loaded);
    const error       = useNotificationsStore((s) => s.error);
    const load        = useNotificationsStore((s) => s.load);
    const unreadCount = useNotificationsStore(selectUnreadCount);
    const openNotification = useOpenNotification();

    const [open, setOpen] = useState(false);
    const wrapRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        void load();
    }, [load]);

    // Hou die ongelees-telling vars, net terwyl die gebruiker werklik aktief is
    // (dieselfde patroon as AutoRefresh.tsx)
    usePollWhileActive(load, POLL_INTERVAL);

    useEffect(() => {
        if (!open) return;
        function handleClickOutside(e: MouseEvent) {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    async function handleItemClick(item: NotificationItem) {
        if (await openNotification(item)) {
            setOpen(false);
        }
    }

    const visibleItems = items.slice(0, POPOVER_LIMIT);

    return (
        <div className="relative" ref={wrapRef}>
            <button
                onClick={() => setOpen((v) => !v)}
                className="relative p-2 rounded-lg text-[var(--color-text-subtle)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)] transition-colors"
                aria-haspopup="dialog"
                aria-expanded={open}
                title="Kennisgewings"
            >
                {unreadCount > 0 ? <BellRing size={18} /> : <Bell size={18} />}
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[var(--color-red)] text-white text-[10px] font-bold flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div
                    role="dialog"
                    aria-label="Kennisgewings"
                    className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl z-50"
                >
                    <div className="p-3 border-b border-[var(--color-border)]">
                        <p className="text-sm font-semibold text-[var(--color-text)]">Kennisgewings</p>
                    </div>

                    {error && (
                        <p className="text-xs text-[var(--color-red)] px-3 pt-2">{error}</p>
                    )}

                    {!loaded ? (
                        !error && <p className="text-sm text-[var(--color-text-subtle)] text-center py-8">Laai...</p>
                    ) : items.length === 0 ? (
                        <p className="text-sm text-[var(--color-text-subtle)] text-center py-8">Geen kennisgewings nie</p>
                    ) : (
                        <div className="divide-y divide-[var(--color-border)]">
                            {visibleItems.map((item) => (
                                <button
                                    key={item._id}
                                    onClick={() => void handleItemClick(item)}
                                    className="w-full text-left p-3 hover:bg-[var(--color-bg)] transition-colors flex gap-2.5"
                                >
                                    <span
                                        className="shrink-0 mt-1.5 w-2 h-2 rounded-full"
                                        style={{ backgroundColor: item.read ? 'transparent' : 'var(--color-primary)' }}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-sm text-[var(--color-text)] ${item.read ? 'font-normal' : 'font-semibold'}`}>
                                            {item.message}
                                        </p>
                                        <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">
                                            {formatDateShort(item.createdAt)}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {items.length > 0 && (
                        <div className="p-2 border-t border-[var(--color-border)]">
                            <Link
                                href="/notifications"
                                onClick={() => setOpen(false)}
                                className="block text-center text-xs font-medium text-[var(--color-primary)] hover:underline py-1"
                            >
                                Sien alles
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
