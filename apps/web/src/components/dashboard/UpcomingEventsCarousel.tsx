'use client';

// ========== Imports: ==========
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, ChevronLeft, ChevronRight, ArrowRight, CalendarClock } from 'lucide-react';
import type { MyRsvp } from '@/lib/api/rsvp';
import { formatDateLong } from '@/lib/format-date';
import { IconChip } from '@/components/ui/IconChip';

const AUTO_ROTATE_MS = 5000;
const RESUME_AFTER_MS = 8000;

export default function UpcomingEventsCarousel({ upcoming }: { upcoming: MyRsvp[] }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);
    const lastInteractionRef = useRef(0);

    useEffect(() => {
        if (upcoming.length <= 1) return;

        const timer = setInterval(() => {
            if (Date.now() - lastInteractionRef.current < RESUME_AFTER_MS) return;
            setActiveIndex((i) => (i + 1) % upcoming.length);
        }, AUTO_ROTATE_MS);

        return () => clearInterval(timer);
    }, [upcoming.length]);

    useEffect(() => {
        setIsVisible(false);
        const frame = requestAnimationFrame(() => setIsVisible(true));
        return () => cancelAnimationFrame(frame);
    }, [activeIndex]);

    function goTo(index: number) {
        lastInteractionRef.current = Date.now();
        setActiveIndex((index + upcoming.length) % upcoming.length);
    }

    if (upcoming.length === 0) {
        return (
            <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 flex items-center justify-center">
                <p className="text-sm text-[var(--color-text-subtle)]">Geen opkomende geleenthede bespreek nie.</p>
            </div>
        );
    }

    const current = upcoming[activeIndex];
    if (!current.event) return null;

    return (
        <div className="relative overflow-hidden lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 hover:border-[var(--color-primary)] transition-colors duration-200">
            <div
                className="pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full opacity-[0.07] blur-3xl"
                style={{ background: 'var(--color-primary)' }}
            />

            <div className="relative flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                    <IconChip tone="blue" size="sm">
                        <CalendarClock size={14} />
                    </IconChip>
                    <p className="text-xs font-medium text-[var(--color-text-subtle)]">
                        {upcoming.length > 1 ? 'Jou volgende geleenthede' : 'Jou volgende geleentheid'}
                    </p>
                </div>
                {upcoming.length > 1 && (
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            type="button"
                            onClick={() => goTo(activeIndex - 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-subtle)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                            aria-label="Vorige geleentheid"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <span className="text-xs text-[var(--color-text-subtle)] tabular-nums px-0.5 min-w-[36px] text-center">
                            {activeIndex + 1} / {upcoming.length}
                        </span>
                        <button
                            type="button"
                            onClick={() => goTo(activeIndex + 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-subtle)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
                            aria-label="Volgende geleentheid"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                )}
            </div>

            <div className={`relative transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
                <h2 className="text-xl font-bold text-[var(--color-text)] leading-snug line-clamp-2">
                    {current.event.title}
                </h2>
                <div className="flex flex-wrap items-center gap-4 mt-3">
                    <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-subtle)]">
                        <Calendar size={14} className="shrink-0 text-[var(--color-primary)]" /> {formatDateLong(current.event.date)}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-subtle)]">
                        <MapPin size={14} className="shrink-0 text-[var(--color-primary)]" /> {current.event.location}
                    </span>
                </div>
            </div>

            <div className="relative flex items-center justify-between gap-3 mt-5">
                <Link
                    href={`/events/${current.event._id}`}
                    className="group inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-text)] text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                    Besigtig geleentheid
                    <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>

                {upcoming.length > 1 && (
                    <div className="flex items-center gap-1.5">
                        {upcoming.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => goTo(i)}
                                aria-label={`Gaan na geleentheid ${i + 1}`}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                    i === activeIndex
                                        ? 'w-5 bg-[var(--color-primary)]'
                                        : 'w-1.5 bg-[var(--color-border)] hover:bg-[var(--color-text-subtle)]'
                                }`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
