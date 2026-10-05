'use client';

// ========== Imports: ==========
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bell, BellRing } from 'lucide-react';
import { usePollWhileActive } from '@/lib/user-activity';
import { listNotificationsAction, markNotificationReadAction } from '@/lib/actions/notification.actions';
import type { NotificationItem } from '@/lib/api/notifications';

const POLL_INTERVAL = 60000;

export default function NotificationBell() {
    const [items, setItems] = useState<NotificationItem[]>([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const load = useCallback(async () => {
        const result = await listNotificationsAction();
        if (result.notifications) {
            setItems(result.notifications);
            setError(null);
        } else if (result.error) {
            setError(result.error);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
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

    const unreadCount = items.filter((n) => !n.read).length;

    async function handleItemClick(item: NotificationItem) {
        if (!item.read) {
            setItems((prev) => prev.map((n) => (n._id === item._id ? { ...n, read: true } : n)));
            const result = await markNotificationReadAction(item._id);
            if (result.error) {
                setItems((prev) => prev.map((n) => (n._id === item._id ? { ...n, read: false } : n)));
                setError(result.error);
                return;
            }
        }
        setOpen(false);
        if (item.event) {
            router.push(`/events/${item.event._id}`);
        }
    }

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
                <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-xl z-50">
                    <div className="p-3 border-b border-[var(--color-border)]">
                        <p className="text-sm font-semibold text-[var(--color-text)]">Kennisgewings</p>
                    </div>

                    {error && (
                        <p className="text-xs text-[var(--color-red)] px-3 pt-2">{error}</p>
                    )}

                    {loading ? (
                        <p className="text-sm text-[var(--color-text-subtle)] text-center py-8">Laai...</p>
                    ) : items.length === 0 ? (
                        <p className="text-sm text-[var(--color-text-subtle)] text-center py-8">Geen kennisgewings nie</p>
                    ) : (
                        <div className="divide-y divide-[var(--color-border)]">
                            {items.map((item) => (
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
                                            {new Date(item.createdAt).toLocaleDateString('af-ZA', { day: '2-digit', month: 'short', year: 'numeric' })}
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

