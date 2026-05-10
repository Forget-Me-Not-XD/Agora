'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar, MapPin, Users, Clock } from 'lucide-react';
import { MOCK_EVENTS } from '@/lib/mock-data';
import type { MockEvent } from '@/lib/mock-data';
import { filterEventsForUser } from '@/lib/rbac';
import { useCurrentUser } from '@/components/UserContext';
import { TYPE_COLORS, TYPE_LABELS, STATUS_COLORS, STATUS_LABELS } from '@/components/EventCard';

const MONTHS = [
    'Januarie', 'Februarie', 'Maart', 'April', 'Mei', 'Junie',
    'Julie', 'Augustus', 'September', 'Oktober', 'November', 'Desember',
];

const DAYS = ['So', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Sa'];

export default function CalendarPage() {
    const user = useCurrentUser();
    const visibleEvents = filterEventsForUser(MOCK_EVENTS, user);

    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [selectedEvent, setSelectedEvent] = useState<MockEvent | null>(null);

    const eventsByDate = useMemo(() => {
        const map: Record<string, MockEvent[]> = {};
        for (const event of visibleEvents) {
            if (!map[event.date]) map[event.date] = [];
            map[event.date].push(event);
        }
        return map;
    }, [visibleEvents]);

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

    const fillPct = (e: MockEvent) => Math.round((e.registered / e.capacity) * 100);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[var(--color-text)]">Kalender</h1>
                <p className="text-sm text-[var(--color-text-subtle)] mt-1">
                    Maandelikse oorsig van geleenthede
                </p>
            </div>

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
                                className={[
                                    'min-h-[96px] p-2',
                                    'border-r border-b border-[var(--color-border)]',
                                    (cellIdx + 1) % 7 === 0 ? 'border-r-0' : '',
                                    isLastRow ? 'border-b-0' : '',
                                    !inMonth ? 'bg-[var(--color-bg)]/60' : '',
                                ].join(' ')}
                            >
                                {inMonth && (
                                    <>
                                        <div
                                            className={[
                                                'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 leading-none',
                                                isToday
                                                    ? 'bg-[var(--color-primary)] text-white'
                                                    : 'text-[var(--color-text-subtle)]',
                                            ].join(' ')}
                                        >
                                            {day}
                                        </div>
                                        <div className="space-y-0.5">
                                            {dayEvents.slice(0, 3).map((event) => (
                                                <button
                                                    key={event.id}
                                                    onClick={() => setSelectedEvent(event)}
                                                    className={[
                                                        'w-full text-left text-[10px] font-semibold px-1.5 py-0.5 rounded truncate block',
                                                        TYPE_COLORS[event.type],
                                                        'hover:opacity-80 transition-opacity',
                                                    ].join(' ')}
                                                >
                                                    {event.title}
                                                </button>
                                            ))}
                                            {dayEvents.length > 3 && (
                                                <span className="text-[9px] text-[var(--color-text-subtle)] pl-1 block">
                                                    +{dayEvents.length - 3} meer
                                                </span>
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
                        <div className={`h-2 w-full ${STATUS_COLORS[selectedEvent.status]}`} />

                        <div className="p-6">
                            {/* Title + close */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <h3 className="text-base font-bold text-[var(--color-text)] leading-snug">
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
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[selectedEvent.status]}`}>
                                    {STATUS_LABELS[selectedEvent.status]}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TYPE_COLORS[selectedEvent.type]}`}>
                                    {TYPE_LABELS[selectedEvent.type]}
                                </span>
                            </div>

                            {/* Description */}
                            <p className="text-sm text-[var(--color-text-subtle)] mb-5 leading-relaxed">
                                {selectedEvent.description}
                            </p>

                            {/* Meta rows */}
                            <div className="space-y-3 mb-5">
                                <div className="flex items-center gap-3 text-sm text-[var(--color-text-subtle)]">
                                    <Calendar size={15} className="shrink-0 text-[var(--color-primary)]" />
                                    <span>{selectedEvent.date}</span>
                                    <Clock size={15} className="shrink-0 text-[var(--color-primary)] ml-2" />
                                    <span>{selectedEvent.time}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-[var(--color-text-subtle)]">
                                    <MapPin size={15} className="shrink-0 text-[var(--color-primary)]" />
                                    <span>{selectedEvent.location}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm text-[var(--color-text-subtle)]">
                                    <Users size={15} className="shrink-0 text-[var(--color-primary)]" />
                                    <span>
                                        {selectedEvent.registered} / {selectedEvent.capacity} geregistreer
                                    </span>
                                </div>
                            </div>

                            {/* Capacity bar */}
                            <div>
                                <div className="h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                                    <div
                                        className={[
                                            'h-full rounded-full transition-all',
                                            fillPct(selectedEvent) >= 100
                                                ? 'bg-red-500'
                                                : fillPct(selectedEvent) >= 80
                                                ? 'bg-amber-500'
                                                : 'bg-[var(--color-primary)]',
                                        ].join(' ')}
                                        style={{ width: `${Math.min(fillPct(selectedEvent), 100)}%` }}
                                    />
                                </div>
                                <p className="text-xs text-[var(--color-text-subtle)] mt-1">
                                    {fillPct(selectedEvent)}% vol
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}