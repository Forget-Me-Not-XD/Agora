import Link from 'next/link';
import type { Event } from '@/lib/api/events';
import { formatDateShort } from '@/lib/format-date';
import { STATUS_LABELS, STATUS_TONE, deriveStatus } from '@/lib/event-view';
import { Pill } from '@/components/ui/Pill';

export default function MyEventsTable({ events }: { events: Event[] }) {
    if (events.length === 0) {
        return (
            <div className="text-center py-8 space-y-3">
                <p className="text-sm text-[var(--color-text-subtle)]">Jy het nog geen geleenthede geskep nie.</p>
                <Link
                    href="/events/create"
                    className="inline-block px-4 py-2 rounded-xl bg-[var(--color-primary)] text-[var(--color-primary-text)] text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                    Skep jou eerste geleentheid
                </Link>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-xs text-[var(--color-text-subtle)] border-b border-[var(--color-border)]">
                        <th className="pb-2 font-medium">Titel</th>
                        <th className="pb-2 font-medium">Datum</th>
                        <th className="pb-2 font-medium">Ligging</th>
                        <th className="pb-2 font-medium">RSVPs / plekke</th>
                        <th className="pb-2 font-medium text-right">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                    {events.map((e) => {
                        const fillRate = e.maxCapacity > 0
                            ? Math.min(100, Math.round((e.confirmedAttendees / e.maxCapacity) * 100))
                            : 0;
                        const status = deriveStatus(e);

                        return (
                            <tr key={e.id} className="hover:bg-[var(--color-bg)]">
                                <td className="py-2.5">
                                    <Link
                                        href={`/events/${e.id}`}
                                        className="text-[var(--color-text)] font-medium hover:text-[var(--color-primary)] hover:underline"
                                    >
                                        {e.title}
                                    </Link>
                                </td>
                                <td className="py-2.5 text-[var(--color-text-subtle)] whitespace-nowrap">{formatDateShort(e.date)}</td>
                                <td className="py-2.5 text-[var(--color-text-subtle)] truncate max-w-[10rem]">{e.location}</td>
                                <td className="py-2.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-20 h-1.5 rounded-full bg-[var(--color-border)] overflow-hidden shrink-0">
                                            <div
                                                className="h-full rounded-full"
                                                style={{ width: `${fillRate}%`, background: 'var(--color-primary)' }}
                                            />
                                        </div>
                                        <span className="text-xs text-[var(--color-text-subtle)] whitespace-nowrap">
                                            {e.confirmedAttendees}/{e.maxCapacity}
                                        </span>
                                    </div>
                                </td>
                                <td className="py-2.5 text-right">
                                    <Pill tone={STATUS_TONE[status]}>{STATUS_LABELS[status]}</Pill>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
