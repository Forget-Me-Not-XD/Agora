'use client';

import { useState, useEffect } from 'react';
import { Search, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import EventCard from '@/components/EventCard';
import InfoModal from '@/components/InfoModal';
import ExportCsvButton from '@/components/ExportCsvButton';
import { canCreateEvents } from '@/lib/rbac';
import { useCurrentUser } from '@/components/UserContext';
import { listEventsAction } from '@/lib/actions/event.actions';
import type { Event } from '@/lib/api/events';
import { ATTENDANCE_OPTIONS, type AttendanceRole } from '@/lib/attendance';
import { deriveStatus, ATTENDANCE_COLORS } from '@/lib/event-view';
import type { EventStatus } from '@/lib/event-view';

export default function EventsPage() {
    const user = useCurrentUser();

    const [events, setEvents]       = useState<Event[]>([]);
    const [loading, setLoading]     = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');
    const [visibilityFilter, setVisibilityFilter] = useState<AttendanceRole | 'all'>('all');

    // Haal die geleenthede van die backend. Rol-sigbaarheid word reeds
    // backend-kant afgedwing, so wys net wat teruggekom het.
    useEffect(() => {
        let active = true;
        (async () => {
            const result = await listEventsAction();
            if (!active) return;
            if (result.error) setLoadError(result.error);
            else setEvents(result.events ?? []);
            setLoading(false);
        })();
        return () => { active = false; };
    }, []);

    const filtered = events.filter((event) => {
        const matchesSearch =
            event.title.toLowerCase().includes(search.toLowerCase()) ||
            event.description.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || deriveStatus(event) === statusFilter;
        const matchesVisibility = visibilityFilter === 'all' || event.intendedAttendance === visibilityFilter;
        return matchesSearch && matchesStatus && matchesVisibility;
    });

    const selectClass =
        'bg-[var(--color-surface)] border border-[var(--color-border)] text-sm text-[var(--color-text)] rounded-xl px-3 py-2 outline-none cursor-pointer';

    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text)]">Geleenthede</h1>
                    <p className="text-sm text-[var(--color-text-subtle)] mt-1">
                        {loading ? 'Laai geleenthede…' : `${filtered.length} geleenthede sigbaar vir jou rol`}
                    </p>
                </div>
                <div className="flex item-center gap-2">
                    <ExportCsvButton type="rsvp-summary"/>
                {canCreateEvents(user.role) && (
                    <Link
                        href="/events/create"
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-text)] rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                        <PlusCircle size={16} />
                        Skep Geleentheid
                    </Link>
                )}
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2 flex-1 min-w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2">
                    <Search size={16} className="text-[var(--color-text-subtle)] shrink-0" />
                    <input
                        type="text"
                        placeholder="Soek geleenthede..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none w-full"
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as EventStatus | 'all')}
                    className={selectClass}
                >
                    <option value="all">Alle Status</option>
                    <option value="upcoming">Aanstaande</option>
                    <option value="ongoing">Aan die gang</option>
                    <option value="past">Verby</option>
                    <option value="cancelled">Gekanselleer</option>
                </select>

                <div className="flex items-center gap-1.5">
                    <select
                        value={visibilityFilter}
                        onChange={(e) => setVisibilityFilter(e.target.value as AttendanceRole | 'all')}
                        className={selectClass}
                    >
                        <option value="all">Alle Sigbaarheid</option>
                        {ATTENDANCE_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>

                    <InfoModal title="Sigbaarheid">
                        <p className="text-sm text-[var(--color-text-subtle)] leading-relaxed">
                            Elke geleentheid het 'n sigbaarheid wat bepaal wie dit kan sien.
                            Jou rol bepaal watter geleenthede vir jou sigbaar is.
                        </p>
                        <div className="space-y-2">
                            {ATTENDANCE_OPTIONS.map((o) => (
                                <div
                                    key={o.value}
                                    className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3"
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ATTENDANCE_COLORS[o.value]}`}>
                                            {o.label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-[var(--color-text-subtle)] leading-relaxed">
                                        {o.desc}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
                            <p className="text-xs font-semibold text-[var(--color-text)] mb-1">Jou rol: {user.role}</p>
                            <p className="text-xs text-[var(--color-text-subtle)] leading-relaxed">
                                {user.role === 'ADMIN' && 'Jy sien alle geleenthede behalwe ander gebruikers se privaat geleenthede.'}
                                {user.role === 'DOSENT' && 'Jy sien publieke, student- en dosente-geleenthede, plus jou eie privaat geleenthede.'}
                                {user.role === 'STUDENT' && 'Jy sien publieke en student-geleenthede.'}
                                {user.role === 'GAS' && 'Jy sien publieke geleenthede.'}
                                {user.role === 'PHOTOGRAPHER' && 'Jy sien publieke en student-geleenthede, plus geleenthede waaraan jy toegewys is.'}
                            </p>
                        </div>
                    </InfoModal>
                </div>
            </div>

            {/* ── Body ── */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <EventCardSkeleton key={i} />
                    ))}
                </div>
            ) : loadError ? (
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-12 text-center">
                    <p className="text-red-600 dark:text-red-400 text-sm">
                        Kon nie geleenthede laai nie: {loadError.replace(/^\[\d+\]\s*/, '')}
                    </p>
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-12 text-center">
                    <p className="text-[var(--color-text-subtle)] text-sm">
                        Geen geleenthede gevind nie.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filtered.map((event) => (
                        <EventCard key={event.id} event={event} />
                    ))}
                </div>
            )}
        </div>
    );
}

// Grys geraamte-kaart terwyl die geleenthede laai
function EventCardSkeleton() {
    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden animate-pulse">
            <div className="h-1 w-full bg-[var(--color-border)]" />
            <div className="p-5 space-y-3">
                <div className="h-4 w-2/3 rounded bg-[var(--color-border)]" />
                <div className="h-3 w-full rounded bg-[var(--color-border)]" />
                <div className="h-3 w-1/2 rounded bg-[var(--color-border)]" />
                <div className="h-1.5 w-full rounded bg-[var(--color-border)] mt-4" />
                <div className="h-9 w-full rounded-xl bg-[var(--color-border)] mt-3" />
            </div>
        </div>
    );
}