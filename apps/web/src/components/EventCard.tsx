import Link from 'next/link';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';
import type { Event } from '@/lib/api/events';
import {
    TYPE_LABELS,
    TYPE_TONE,
    STATUS_LABELS,
    STATUS_TONE,
    STATUS_COLORS,
    deriveStatus,
    eventDateKey,
    eventTime,
    fillPercentage,
} from '@/lib/event-view';
import { Pill } from '@/components/ui/Pill';
import RsvpModal from './RsvpModal';
import PaymentModal from './PaymentModal';
import AlreadyRsvpdTag from './AlreadyRsvpdTag';

interface EventCardProps {
    event: Event;
    alreadyRsvpd?: boolean;
    isNew?: boolean;
}

export default function EventCard({ event, alreadyRsvpd = false, isNew = false }: EventCardProps) {
    const status  = deriveStatus(event);
    const fillPct = fillPercentage(event);
    const isFull       = fillPct >= 100;
    const isAlmostFull = fillPct >= 80 && !isFull;

    return (

        <div
            className={[
                'bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden flex flex-col hover:shadow-md hover:border-[var(--color-primary)] transition-all duration-200',
                isNew ? 'animate-glow-fade' : '',
            ].join(' ')}
        >

            {/* Coloured top accent */}
            <div className={`h-1 w-full ${STATUS_COLORS[status]}`} />

            <Link href={`/events/${event.id}`} className="p-5 pb-0 flex flex-col gap-3 flex-1">
                {/* Title + badges */}
                <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[var(--color-text)] leading-snug flex-1">
                        {event.title}
                    </h3>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                        <Pill tone={STATUS_TONE[status]}>{STATUS_LABELS[status]}</Pill>
                        <Pill tone={TYPE_TONE[event.type]}>{TYPE_LABELS[event.type]}</Pill>
                        {event.sellsTickets && <Pill tone="yellow">Betaal</Pill>}
                    </div>
                </div>

                {/* Description */}
                <p className="text-xs text-[var(--color-text-subtle)] line-clamp-2 leading-relaxed">
                    {event.description}
                </p>

                {/* Meta */}
                <div className="space-y-1.5 mt-auto">
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-subtle)]">
                        <Calendar size={12} className="shrink-0" />
                        <span>{eventDateKey(event)}</span>
                        <Clock size={12} className="ml-1 shrink-0" />
                        <span>{eventTime(event)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-subtle)]">
                        <MapPin size={12} className="shrink-0" />
                        <span className="truncate">{event.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-subtle)]">
                        <Users size={12} className="shrink-0" />
                        <span>{event.confirmedAttendees} / {event.maxCapacity} geregistreer</span>
                    </div>
                </div>

                {/* Capacity bar */}
                <div>
                    <div className="h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all ${
                                isFull ? 'bg-red-500' : isAlmostFull ? 'bg-amber-500' : 'bg-[var(--color-primary)]'
                            }`}
                            style={{ width: `${Math.min(fillPct, 100)}%` }}
                        />
                    </div>
                    <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-[var(--color-text-subtle)]">{fillPct}% vol</p>
                        {isFull && <span className="text-xs font-semibold text-red-600 dark:text-red-400">Vol</span>}
                        {isAlmostFull && <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">Byna vol</span>}
                    </div>
                </div>
            </Link>

            <div className="p-5 pt-3">
                {alreadyRsvpd ? (
                    <AlreadyRsvpdTag eventId={event.id} />
                ) : event.sellsTickets ? (
                    <PaymentModal event={event} />
                ) : (
                    <RsvpModal event={event} />
                )}
            </div>
        </div>

    );
}