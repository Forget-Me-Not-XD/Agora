'use client';

// ========== Imports: ==========
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, MapPin, Navigation } from 'lucide-react';
import type { MyRsvp, MyRsvpEvent } from '@/lib/api/rsvp';
import { IconChip } from '@/components/ui/IconChip';
import { Pill } from '@/components/ui/Pill';
import RsvpQrButton from '@/components/RsvpQrButton';
import { buildMapsUrl, fullName } from '@/lib/rsvp-view';
import { formatEventDate, relativeDay } from '@/lib/metrics';
import { eventDetailHref } from '@/lib/event-origin';

const AUTO_ROTATE_MS  = 5000;
// Ná 'n klik op 'n pyltjie of kolletjie wag die karrousel eers 'n rukkie voor dit weer self draai
const RESUME_AFTER_MS = 8000;

const PRIMARY_BUTTON   = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-text)] text-sm font-semibold hover:opacity-90 transition-opacity';
const SECONDARY_BUTTON = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text)] text-sm font-medium hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors';
const ARROW_BUTTON     = 'w-7 h-7 flex items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-text-subtle)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors';

/** 'n RSVP met sy geleentheid gelaai, soos AttendeeDashboard dit filtreer */
export type ActiveRsvp = MyRsvp & { event: MyRsvpEvent };

/**
 * Bo-aan die bywoner se dashboard: die opkomende geleenthede waarvoor hy RSVP het, een op 'n slag,
 * met alles wat hy by die deur nodig het (QR-kode, aanwysings) as knoppies. Dit draai self, maar
 * staan stil terwyl iemand dit gebruik: met die muis daaroor, met die sleutelbord daarin, of terwyl
 * 'n QR-kode oop is. Anders sou die skyfie agter die QR-venster verander.
 */
export default function UpcomingEventsCarousel({ upcoming, attendeeName }: { upcoming: ActiveRsvp[]; attendeeName: string }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isVisible, setIsVisible]     = useState(true);
    const [hovered, setHovered]         = useState(false);
    const [focused, setFocused]         = useState(false);
    const [qrOpen, setQrOpen]           = useState(false);
    const lastInteractionRef = useRef(0);

    const paused = hovered || focused || qrOpen;

    useEffect(() => {
        if (upcoming.length <= 1 || paused) return;
        // Iemand wat minder beweging op die skerm gevra het, kry net die pyltjies
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const timer = setInterval(() => {
            if (Date.now() - lastInteractionRef.current < RESUME_AFTER_MS) return;
            setActiveIndex((i) => (i + 1) % upcoming.length);
        }, AUTO_ROTATE_MS);

        return () => clearInterval(timer);
    }, [upcoming.length, paused]);

    // Laat elke nuwe skyfie kort invaag
    useEffect(() => {
        setIsVisible(false);
        const frame = requestAnimationFrame(() => setIsVisible(true));
        return () => cancelAnimationFrame(frame);
    }, [activeIndex]);

    function goTo(index: number) {
        lastInteractionRef.current = Date.now();
        setActiveIndex((index + upcoming.length) % upcoming.length);
    }

    const current = upcoming[activeIndex] ?? upcoming[0];
    if (!current) return null;

    const { event } = current;
    const started = new Date(event.date).getTime() <= Date.now();
    const when = relativeDay(event.date);
    const heading = started ? 'Nou aan die gang'
        : activeIndex === 0 ? `Jou volgende geleentheid · ${when}`
        : `Opkomend · ${when}`;
    const mapsUrl = buildMapsUrl(event.lat, event.lon);
    const eventDate = formatEventDate(event.date);

    // Dieselfde vir die eie en die plus-een se QR-kode; net die naam en RSVP verskil
    const ticket = {
        eventTitle:    event.title,
        eventDate,
        eventLocation: event.location,
        eventAddress:  event.address,
        mapsUrl,
        onOpenChange:  setQrOpen,
    };

    return (
        <section
            aria-roledescription="karrousel"
            aria-label="Jou opkomende geleenthede"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setFocused(true)}
            onBlur={(e) => {
                // Net as die fokus heeltemal uit die karrousel gaan, nie tussen sy eie knoppies nie
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
            }}
            className="relative overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 hover:border-[var(--color-primary)] transition-colors duration-200"
        >
            <div
                className="pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full opacity-[0.07] blur-3xl"
                style={{ background: 'var(--color-primary)' }}
            />

            <div className="relative flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 min-w-0">
                    <IconChip tone="blue" size="sm"><CalendarClock size={14} /></IconChip>
                    <p className="text-xs font-medium text-[var(--color-text-subtle)] truncate">{heading}</p>
                </div>
                {upcoming.length > 1 && (
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button type="button" onClick={() => goTo(activeIndex - 1)} className={ARROW_BUTTON} aria-label="Vorige geleentheid">
                            <ChevronLeft size={14} />
                        </button>
                        <span className="text-xs text-[var(--color-text-subtle)] tabular-nums px-0.5 min-w-[36px] text-center" aria-live="polite">
                            {activeIndex + 1} / {upcoming.length}
                        </span>
                        <button type="button" onClick={() => goTo(activeIndex + 1)} className={ARROW_BUTTON} aria-label="Volgende geleentheid">
                            <ChevronRight size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* key: elke skyfie kry sy eie QR-knoppies, sodat 'n QR-kode nooit by die verkeerde geleentheid hoort nie */}
            <div key={current._id} className={`relative space-y-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
                <div>
                    <h2 className="text-xl font-bold text-[var(--color-text)] leading-snug line-clamp-2 [overflow-wrap:anywhere]">{event.title}</h2>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-[var(--color-text-subtle)]">
                        <span>{eventDate}</span>
                        <span className="flex items-center gap-1.5 min-w-0">
                            <MapPin size={14} className="shrink-0" />
                            <span className="truncate">{event.location}</span>
                        </span>
                    </div>
                </div>

                {/* Wat die bywoner by die deur moet doen, of dat dit reeds klaar is */}
                {current.checkedIn ? (
                    <Pill tone="green"><CheckCircle2 size={12} /> Jy is reeds ingeteken</Pill>
                ) : (
                    <p className="text-sm text-[var(--color-text)]">
                        By die deur: wys jou QR-kode, dan teken die organiseerder jou in.
                    </p>
                )}

                <div className="flex flex-wrap gap-2">
                    {!current.checkedIn && (
                        <RsvpQrButton
                            {...ticket}
                            rsvpId={current._id}
                            attendeeName={attendeeName}
                            label="Wys my QR-kode"
                            triggerClassName={PRIMARY_BUTTON}
                        />
                    )}
                    {current.plusOneRsvpId && (
                        <RsvpQrButton
                            {...ticket}
                            rsvpId={current.plusOneRsvpId}
                            attendeeName={fullName(current.plusOneName, current.plusOneSurname)}
                            label="Plus-een se QR-kode"
                            triggerClassName={SECONDARY_BUTTON}
                        />
                    )}
                    {mapsUrl && (
                        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={SECONDARY_BUTTON}>
                            <Navigation size={14} /> Kry aanwysings
                        </a>
                    )}
                    <Link href={eventDetailHref(event._id, { from: 'oorsig' })} className={SECONDARY_BUTTON}>
                        Besonderhede <ArrowRight size={14} />
                    </Link>
                </div>
            </div>

            {upcoming.length > 1 && (
                <div className="relative flex items-center justify-center gap-1.5 mt-5">
                    {upcoming.map((r, i) => (
                        <button
                            key={r._id}
                            type="button"
                            onClick={() => goTo(i)}
                            aria-label={`Gaan na geleentheid ${i + 1}`}
                            aria-current={i === activeIndex}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                i === activeIndex
                                    ? 'w-5 bg-[var(--color-primary)]'
                                    : 'w-1.5 bg-[var(--color-border)] hover:bg-[var(--color-text-subtle)]'
                            }`}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
