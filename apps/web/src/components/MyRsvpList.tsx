'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, X, Loader2 } from 'lucide-react';
import type { MyRsvp, RsvpStatus } from '@/lib/api/rsvp';
import { formatDateLong } from '@/lib/format-date';
import { cancelRsvpAction } from '@/lib/actions/rsvp.actions';
import RsvpQrButton from '@/components/RsvpQrButton';

const STATUS_STYLE: Record<RsvpStatus, string> = {
    BEVESTIG: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    HANGENDE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    GEKANSELLEER: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_LABEL: Record<RsvpStatus, string> = {
    BEVESTIG: 'Bevestig',
    HANGENDE: 'Hangende',
    GEKANSELLEER: 'Gekanselleer',
};

const FILTERS: { value: RsvpStatus | 'alles'; label: string }[] = [
    { value: 'alles', label: 'Alles' },
    { value: 'BEVESTIG', label: 'Bevestig' },
    { value: 'HANGENDE', label: 'Hangende' },
    { value: 'GEKANSELLEER', label: 'Gekanselleer' },
];

export default function MyRsvpList({ initialRsvps }: { initialRsvps: MyRsvp[] }) {
    const [rsvps, setRsvps] = useState(initialRsvps);
    const [filter, setFilter] = useState<RsvpStatus | 'alles'>('alles');
    const [confirmId, setConfirmId] = useState<string | null>(null);
    const [cancelingId, setCancelingId] = useState<string | null>(null);
    const [errorId, setErrorId] = useState<string | null>(null);

    const sorted = [...rsvps].sort((a, b) => {
        const aTime = new Date(a.event?.date ?? a.createdAt).getTime();
        const bTime = new Date(b.event?.date ?? b.createdAt).getTime();
        return aTime - bTime;
    });

    const filtered = filter === 'alles' ? sorted : sorted.filter((r) => r.status === filter);

    async function handleCancel(rsvpId: string) {
        setCancelingId(rsvpId);
        setErrorId(null);
        const result = await cancelRsvpAction(rsvpId);
        if (result.error) {
            setErrorId(rsvpId);
        } else {
            setRsvps((prev) =>
                prev.map((r) => (r._id === rsvpId ? { ...r, status: 'GEKANSELLEER' as RsvpStatus } : r)),
            );
            setConfirmId(null);
        }
        setCancelingId(null);
    }

    if (rsvps.length === 0) {
        return (
            <p className="text-sm text-[var(--color-text-subtle)] text-center py-12">
                Jy het nog nie vir enige geleentheid ingeteken nie.
            </p>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                    <button
                        key={f.value}
                        onClick={() => setFilter(f.value)}
                        className={[
                            'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                            filter === f.value
                                ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-primary-text)]'
                                : 'bg-[var(--color-bg)] border-[var(--color-border)] text-[var(--color-text-subtle)] hover:text-[var(--color-text)]',
                        ].join(' ')}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <p className="text-sm text-[var(--color-text-subtle)] text-center py-12">
                    Geen RSVPs met hierdie status nie.
                </p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map((r) => {
                        const isCancelled = r.status === 'GEKANSELLEER';
                        return (
                            <div
                                key={r._id}
                                className={[
                                    'bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 flex flex-col gap-3',
                                    isCancelled ? 'opacity-60' : '',
                                ].join(' ')}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        {r.event ? (
                                            <Link
                                                href={`/events/${r.event._id}`}
                                                className="text-sm font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)] hover:underline truncate block"
                                            >
                                                {r.event.title}
                                            </Link>
                                        ) : (
                                            <span className="text-sm font-semibold text-[var(--color-text)]">
                                                Onbekende geleentheid
                                            </span>
                                        )}
                                    </div>
                                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[r.status]}`}>
                                        {STATUS_LABEL[r.status]}
                                    </span>
                                </div>

                                {r.event && (
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2 text-xs text-[var(--color-text-subtle)]">
                                            <Calendar size={13} className="shrink-0" />
                                            {formatDateLong(r.event.date)}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-[var(--color-text-subtle)]">
                                            <MapPin size={13} className="shrink-0" />
                                            <span className="truncate">{r.event.location}</span>
                                        </div>
                                    </div>
                                )}

                                {errorId === r._id && (
                                    <p className="text-xs text-[var(--color-red)]">
                                        Kon nie kanselleer nie. Probeer asseblief weer.
                                    </p>
                                )}

                                <div className="flex items-center gap-4 pt-3 mt-1 border-t border-[var(--color-border)]">
                                    <RsvpQrButton
                                        rsvpId={r._id}
                                        eventTitle={r.event?.title ?? 'Geleentheid'}
                                        disabled={isCancelled}
                                    />

                                    {!isCancelled && (
                                        <div className="ml-auto flex items-center gap-2">
                                            {confirmId === r._id ? (
                                                <>
                                                    <span className="text-xs text-[var(--color-text-subtle)]">Seker?</span>
                                                    <button
                                                        onClick={() => handleCancel(r._id)}
                                                        disabled={cancelingId === r._id}
                                                        className="flex items-center gap-1 text-xs font-medium text-[var(--color-red)] hover:underline disabled:opacity-50"
                                                    >
                                                        {cancelingId === r._id && <Loader2 size={12} className="animate-spin" />}
                                                        Ja, kanselleer
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmId(null)}
                                                        disabled={cancelingId === r._id}
                                                        className="text-xs text-[var(--color-text-subtle)] hover:underline"
                                                    >
                                                        Nee
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => setConfirmId(r._id)}
                                                    className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-text-subtle)] hover:text-[var(--color-red)] transition-colors"
                                                >
                                                    <X size={14} />
                                                    Kanselleer
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
