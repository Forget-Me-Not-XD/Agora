// ========== Imports: ==========
import Link from 'next/link';
import { CalendarClock, MapPin, Pencil, Users } from 'lucide-react';
import type { Event } from '@/lib/api/events';
import { IconChip } from '@/components/ui/IconChip';
import { Pill, TONE_VAR } from '@/components/ui/Pill';
import { deriveStatus } from '@/lib/event-view';
import { fillRateBand, formatEventDate, percent, relativeDay } from '@/lib/metrics';

/** Vir die dosent: sy eerste opkomende geleentheid, met hoe vol dit is en die twee aksies wat hy nodig het. */
export default function NextEventCard({ event }: { event: Event | null }) {
    if (!event) {
        return (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 flex flex-col items-start justify-center gap-3">
                <p className="text-sm text-[var(--color-text-subtle)]">Jy het geen opkomende geleenthede nie.</p>
                <Link
                    href="/events/create"
                    className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-text)] text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                    Skep &apos;n geleentheid
                </Link>
            </div>
        );
    }

    const fill = percent(event.confirmedAttendees, event.maxCapacity);
    const band = fill !== null ? fillRateBand(fill) : null;
    // DosentDashboard stuur ook 'n geleentheid wat reeds begin het; "vandag" sou dan onduidelik wees
    const ongoing = deriveStatus(event) === 'ongoing';

    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <IconChip tone="blue" size="sm"><CalendarClock size={14} /></IconChip>
                <p className="text-xs font-medium text-[var(--color-text-subtle)]">
                    {ongoing ? 'Nou aan die gang' : `Jou volgende geleentheid · ${relativeDay(event.date)}`}
                </p>
            </div>

            <div>
                <h2 className="text-lg font-bold text-[var(--color-text)] leading-snug line-clamp-2">{event.title}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-[var(--color-text-subtle)]">
                    <span>{formatEventDate(event.date)}</span>
                    <span className="flex items-center gap-1.5 min-w-0">
                        <MapPin size={14} className="shrink-0" />
                        <span className="truncate">{event.location}</span>
                    </span>
                </div>
            </div>

            {fill !== null && band && (
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-[var(--color-text)]">
                            <strong>{event.confirmedAttendees}</strong> RSVPs vir {event.maxCapacity} plekke
                        </span>
                        <Pill tone={band.tone}>{fill}% · {band.label}</Pill>
                    </div>
                    <div className="h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.min(fill, 100)}%`, background: TONE_VAR[band.tone] }}
                        />
                    </div>
                </div>
            )}

            <div className="flex flex-wrap gap-2 mt-auto">
                <Link
                    href={`/events/${event.id}#deelnemers`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-text)] text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                    <Users size={15} /> Sien deelnemers
                </Link>
                <Link
                    href={`/events/${event.id}/edit`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--color-border)] text-[var(--color-text)] text-sm font-medium hover:border-[var(--color-primary)] transition-colors"
                >
                    <Pencil size={14} /> Wysig
                </Link>
            </div>
        </div>
    );
}
