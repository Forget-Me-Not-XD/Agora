'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, X, Calendar, MapPin, Users, Clock, ArrowRight, Settings2 } from 'lucide-react';
import { listEventsAction } from '@/lib/actions/event.actions';
import { getMyRsvpsAction } from '@/lib/actions/rsvp.actions';
import { useCurrentUser } from '@/components/UserContext';
import { isEventOrganiser } from '@/lib/rbac';
import RsvpModal from '@/components/RsvpModal';
import PaymentModal from '@/components/PaymentModal';
import AlreadyRsvpdTag from '@/components/AlreadyRsvpdTag';
import { useSearchParams } from 'next/navigation';
import { eventDetailHref, monthKey, parseMonthKey, type EventOrigin } from '@/lib/event-origin';
import type { Event } from '@/lib/api/events';
import {
    TYPE_COLORS,
    TYPE_TONE,
    TYPE_LABELS,
    STATUS_COLORS,
    STATUS_TONE,
    STATUS_LABELS,
    deriveStatus,
    eventDateKey,
    eventTime,
    fillPercentage,
} from '@/lib/event-view';
import { Pill } from '@/components/ui/Pill';

const MONTHS = [
    'Januarie', 'Februarie', 'Maart', 'April', 'Mei', 'Junie',
    'Julie', 'Augustus', 'September', 'Oktober', 'November', 'Desember',
];

const DAYS = ['So', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Sa'];

export default function CalendarPage() {
    const user = useCurrentUser();
    const [events, setEvents]       = useState<Event[]>([]);
    // Geleenthede waarvoor die gebruiker reeds RSVP het, sodat die venster nie weer "RSVP" aanbied nie
    const [rsvpdEventIds, setRsvpdEventIds] = useState<Set<string>>(new Set());
    const [loading, setLoading]     = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const today = new Date();
    // Die maand kom uit die adres (?maand=2026-12) as dit daar is, bv. ná "Terug na kalender"
    const searchParams = useSearchParams();
    const initialMonth = parseMonthKey(searchParams.get('maand'));
    const [viewYear, setViewYear] = useState(initialMonth?.year ?? today.getFullYear());
    const [viewMonth, setViewMonth] = useState(initialMonth?.monthIndex ?? today.getMonth());
    const currentMonthKey = monthKey(viewYear, viewMonth);

    // Hou die maand in die adres, sodat die blaaier se eie terug-knoppie ook by dieselfde maand
    // uitkom. replaceState (nie router.replace nie): dit skep geen nuwe geskiedenis-inskrywing
    // nie en laai niks van die bediener af nie; Next 14 hou useSearchParams daarmee in lyn.
    useEffect(() => {
        const url = new URL(window.location.href);
        if (url.searchParams.get('maand') === currentMonthKey) return;
        url.searchParams.set('maand', currentMonthKey);
        window.history.replaceState(window.history.state, '', url);
    }, [currentMonthKey]);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

    // Haal die geleenthede
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

    // Soos die geleenthede-bladsy: misluk dit, wys die venster net "RSVP", en die backend
    // keur 'n tweede RSVP in elk geval af
    const loadRsvps = useCallback(async () => {
        const result = await getMyRsvpsAction();
        if (!result.rsvps) return;
        setRsvpdEventIds(new Set(
            result.rsvps.filter((r) => r.status !== 'GEKANSELLEER' && r.event).map((r) => r.event!._id),
        ));
    }, []);

    useEffect(() => { loadRsvps(); }, [loadRsvps]);

    // Ná 'n RSVP in die venster: die gebruiker se RSVPs en die geleentheid se RSVP-telling het verander
    const refreshAfterRsvp = useCallback(async () => {
        await loadRsvps();
        const result = await listEventsAction();
        if (!result.events) return;
        setEvents(result.events);
        setSelectedEvent((current) => current && (result.events!.find((e) => e.id === current.id) ?? current));
    }, [loadRsvps]);

    const eventsByDate = useMemo(() => {
        const map: Record<string, Event[]> = {};
        for (const event of events) {
            const key = eventDateKey(event);
            if (!map[key]) map[key] = [];
            map[key].push(event);
        }
        return map;
    }, [events]);

    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

    function prevMonth() {
        if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
        else setViewMonth((m) => m - 1);
    }

    function nextMonth() {
        if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
        else setViewMonth((m) => m + 1);
    }

    function dateKey(day: number) {
        return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const selectedDayEvents = selectedDayKey ? (eventsByDate[selectedDayKey] ?? []) : [];
    const selectedDayLabel = selectedDayKey
        ? (() => {
            const [y, m, d] = selectedDayKey.split('-').map(Number);
            return `${d} ${MONTHS[m - 1]} ${y}`;
        })()
        : '';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text)]">Kalender</h1>
                    <p className="text-sm text-[var(--color-text-subtle)] mt-1">
                        Maandelikse oorsig van geleenthede
                    </p>
                </div>
                {loading && (
                    <span className="text-xs text-[var(--color-text-subtle)] animate-pulse">
                        Laai geleenthede…
                    </span>
                )}
            </div>

            {loadError && (
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4 text-center">
                    <p className="text-red-600 dark:text-red-400 text-sm">
                        Kon nie geleenthede laai nie: {loadError.replace(/^\[\d+\]\s*/, '')}
                    </p>
                </div>
            )}

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
                {/* Month navigation */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
                    <button
                        onClick={prevMonth}
                        className="p-2 rounded-xl hover:bg-[var(--color-border)] text-[var(--color-text-subtle)] hover:text-[var(--color-text)] transition-colors"
                        aria-label="Vorige maand"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <h2 className="text-base font-semibold text-[var(--color-text)]">
                        {MONTHS[viewMonth]} {viewYear}
                    </h2>
                    <button
                        onClick={nextMonth}
                        className="p-2 rounded-xl hover:bg-[var(--color-border)] text-[var(--color-text-subtle)] hover:text-[var(--color-text)] transition-colors"
                        aria-label="Volgende maand"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>

                {/* Day-of-week headers */}
                <div className="grid grid-cols-7 border-b border-[var(--color-border)]">
                    {DAYS.map((d) => (
                        <div
                            key={d}
                            className="py-2.5 text-center text-xs font-semibold text-[var(--color-text-subtle)] tracking-wide"
                        >
                            {d}
                        </div>
                    ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7">
                    {Array.from({ length: totalCells }).map((_, cellIdx) => {
                        const day = cellIdx - firstDay + 1;
                        const inMonth = day >= 1 && day <= daysInMonth;
                        const key = inMonth ? dateKey(day) : '';
                        const dayEvents = inMonth ? (eventsByDate[key] ?? []) : [];
                        const isToday = key === todayKey;
                        const isLastRow = cellIdx >= totalCells - 7;

                        return (
                            <div
                                key={cellIdx}
                                onClick={() => inMonth && dayEvents.length > 0 && setSelectedDayKey(key)}
                                className={[
                                    'min-h-[96px] p-2',
                                    'border-r border-b border-[var(--color-border)]',
                                    (cellIdx + 1) % 7 === 0 ? 'border-r-0' : '',
                                    isLastRow ? 'border-b-0' : '',
                                    !inMonth ? 'bg-[var(--color-bg-soft)]' : '',
                                    inMonth && dayEvents.length > 0 ? 'cursor-pointer hover:bg-[var(--color-bg)] transition-colors' : '',
                                ].join(' ')}
                            >
                                {inMonth && (
                                    <>
                                        <div
                                            className={[
                                                'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 leading-none',
                                                isToday
                                                    ? 'bg-[var(--color-primary)] text-[var(--color-primary-text)]'
                                                    : 'text-[var(--color-text-subtle)]',
                                            ].join(' ')}
                                        >
                                            {day}
                                        </div>
                                        <div className="space-y-0.5">
                                            {dayEvents.slice(0, 3).map((event) => (
                                                <button
                                                    key={event.id}
                                                    onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                                                    className={[
                                                        'w-full text-left text-[16px] font-semibold px-1.5 py-0.5 rounded truncate block',
                                                        TYPE_COLORS[event.type],
                                                        'hover:opacity-80 transition-opacity',
                                                    ].join(' ')}
                                                >
                                                    {event.title}
                                                </button>
                                            ))}
                                            {dayEvents.length > 3 && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setSelectedDayKey(key); }}
                                                    className="w-full text-left text-[16px] font-semibold text-[var(--color-primary)] hover:underline pl-1.5 block"
                                                >
                                                    +{dayEvents.length - 3} meer
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4">
                {[
                    { color: 'bg-cyan-600', label: TYPE_LABELS.public },
                    { color: 'bg-violet-600', label: TYPE_LABELS.internal_student },
                    { color: 'bg-amber-500', label: TYPE_LABELS.private },
                    { color: 'bg-indigo-600', label: TYPE_LABELS.department },
                ].map((item) => (
                    <span key={item.label} className="flex items-center gap-1.5 text-xs text-[var(--color-text-subtle)]">
                        <span className={`w-2.5 h-2.5 rounded-sm ${item.color} shrink-0`} />
                        {item.label}
                    </span>
                ))}
            </div>

            {/* Day popup — full list of events for a clicked day */}
            {selectedDayKey && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setSelectedDayKey(null)}
                >
                    <div
                        className="bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[var(--color-border)] shrink-0">
                            <h3 className="text-base font-bold text-[var(--color-text)]">{selectedDayLabel}</h3>
                            <button
                                onClick={() => setSelectedDayKey(null)}
                                className="p-1.5 rounded-lg hover:bg-[var(--color-border)] text-[var(--color-text-subtle)] shrink-0 transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-4 space-y-2 overflow-y-auto">
                            {selectedDayEvents.map((event) => (
                                <button
                                    key={event.id}
                                    onClick={() => { setSelectedDayKey(null); setSelectedEvent(event); }}
                                    className="w-full text-left bg-[var(--color-bg)] hover:bg-[var(--color-border)] rounded-xl p-3 transition-colors flex items-start justify-between gap-3"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-[var(--color-text)] truncate">{event.title}</p>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-[var(--color-text-subtle)]">
                                            <Clock size={12} className="shrink-0" />
                                            {eventTime(event)}
                                            <MapPin size={12} className="ml-1 shrink-0" />
                                            <span className="truncate">{event.location}</span>
                                        </div>
                                    </div>
                                    <Pill tone={TYPE_TONE[event.type]} className="shrink-0">{TYPE_LABELS[event.type]}</Pill>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Event detail popup */}
            {selectedEvent && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
                    onClick={() => setSelectedEvent(null)}
                >
                    <div
                        className="bg-[var(--color-surface)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className={`h-2 w-full ${STATUS_COLORS[deriveStatus(selectedEvent)]}`} />

                        <div className="p-6">
                            {/* Title + close */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <h3 className="text-base font-bold text-[var(--color-text)] leading-snug [overflow-wrap:anywhere]">
                                    {selectedEvent.title}
                                </h3>
                                <button
                                    onClick={() => setSelectedEvent(null)}
                                    className="p-1.5 rounded-lg hover:bg-[var(--color-border)] text-[var(--color-text-subtle)] shrink-0 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Status + type badges */}
                            <div className="flex gap-2 mb-4">
                                <Pill tone={STATUS_TONE[deriveStatus(selectedEvent)]}>
                                    {STATUS_LABELS[deriveStatus(selectedEvent)]}
                                </Pill>
                                <Pill tone={TYPE_TONE[selectedEvent.type]}>
                                    {TYPE_LABELS[selectedEvent.type]}
                                </Pill>
                            </div>

                            {/* Description */}
                            <p className="text-sm text-[var(--color-text-subtle)] mb-5 leading-relaxed">
                                {selectedEvent.description}
                            </p>

                            {/* Meta rows */}
                            <div className="space-y-3 mb-5">
                                <div className="flex items-center gap-3 text-sm text-[var(--color-text-subtle)]">
                                    <Calendar size={15} className="shrink-0 text-[var(--color-primary)]" />
                                    <span>{eventDateKey(selectedEvent)}</span>
                                    <Clock size={15} className="shrink-0 text-[var(--color-primary)] ml-2" />
                                    <span>{eventTime(selectedEvent)}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-[var(--color-text-subtle)]">
                                    <MapPin size={15} className="shrink-0 text-[var(--color-primary)]" />
                                    <span>{selectedEvent.location}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-[var(--color-text-subtle)]">
                                    <Users size={15} className="shrink-0 text-[var(--color-primary)]" />
                                    <span>
                                        {selectedEvent.confirmedAttendees} / {selectedEvent.maxCapacity} RSVPs
                                    </span>
                                </div>
                            </div>

                            {/* Capacity bar */}
                            <div>
                                <div className="h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                                    <div
                                        className={[
                                            'h-full rounded-full transition-all',
                                            fillPercentage(selectedEvent) >= 100
                                                ? 'bg-red-500'
                                                : fillPercentage(selectedEvent) >= 80
                                                ? 'bg-amber-500'
                                                : 'bg-[var(--color-primary)]',
                                        ].join(' ')}
                                        style={{ width: `${Math.min(fillPercentage(selectedEvent), 100)}%` }}
                                    />
                                </div>
                                <p className="text-xs text-[var(--color-text-subtle)] mt-1">
                                    {fillPercentage(selectedEvent)}% vol
                                </p>
                            </div>

                            <EventActions
                                event={selectedEvent}
                                isOrganiser={isEventOrganiser(user, selectedEvent)}
                                origin={{ from: 'kalender', month: currentMonthKey }}
                                alreadyRsvpd={rsvpdEventIds.has(selectedEvent.id)}
                                onRsvpClose={refreshAfterRsvp}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
/**
 * Onderaan die geleentheid-venster: wat die gebruiker met die geleentheid kan doen, soos op 'n
 * geleentheidskaart. Die organiseerder bestuur dit, ander RSVP of koop 'n kaartjie, en almal kan
 * die volledige bladsy oopmaak.
 */
function EventActions({ event, isOrganiser, origin, alreadyRsvpd, onRsvpClose }: {
    event:        Event;
    isOrganiser:  boolean;
    /** Sodat die geleentheid se "Terug" na hierdie maand in die kalender lei */
    origin:       EventOrigin;
    alreadyRsvpd: boolean;
    onRsvpClose:  () => void;
}) {
    const isPast = deriveStatus(event) === 'past';

    return (
        <div className="mt-5 pt-5 border-t border-[var(--color-border)] space-y-2">
            {isOrganiser ? (
                <Link
                    href={eventDetailHref(event.id, origin, 'deelnemers')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-text)] rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                >
                    <Settings2 size={15} /> Bestuur geleentheid
                </Link>
            ) : alreadyRsvpd ? (
                <AlreadyRsvpdTag eventId={event.id} />
            ) : isPast ? (
                <p className="text-xs text-[var(--color-text-subtle)] text-center">
                    Hierdie geleentheid is verby, so RSVP is gesluit.
                </p>
            ) : event.sellsTickets ? (
                <PaymentModal event={event} />
            ) : (
                <RsvpModal event={event} onClose={onRsvpClose} />
            )}

            <Link
                href={eventDetailHref(event.id, origin)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text)] text-sm font-medium hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
            >
                Sien besonderhede <ArrowRight size={15} />
            </Link>
        </div>
    );
}
