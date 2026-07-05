import Link from 'next/link';
import type { Event } from '@/lib/api/events';
import { formatDateShort } from '@/lib/format-date';

export default function MyEventsTable({ events }: { events: Event[] }) {
    if (events.length === 0) {
        return (
            <p className="text-xs text-[var(--color-text-subtle)] text-center py-8">
                Jy het nog geen geleenthede geskep nie.
            </p>
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
                        <th className="pb-2 font-medium">Kapasiteit</th>
                        <th className="pb-2 font-medium text-right">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                    {events.map((e) => {
                        const fillRate = e.maxCapacity > 0
                            ? Math.min(100, Math.round((e.confirmedAttendees / e.maxCapacity) * 100))
                            : 0;
                        const isUpcoming = new Date(e.date).getTime() >= Date.now();

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
                                    <span
                                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                            isUpcoming
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-[var(--color-border)] text-[var(--color-text-subtle)]'
                                        }`}
                                    >
                                        {isUpcoming ? 'Opkomend' : 'Verby'}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
