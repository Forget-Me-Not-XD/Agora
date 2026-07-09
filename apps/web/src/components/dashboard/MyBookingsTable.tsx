import Link from 'next/link';
import type { MyRsvp } from '@/lib/api/rsvp';
import { formatDateShort } from '@/lib/format-date';
import RsvpQrButton from '@/components/RsvpQrButton';

const STATUS_STYLE: Record<string, string> = {
    BEVESTIG: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    HANGENDE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    GEKANSELLEER: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_LABEL: Record<string, string> = {
    BEVESTIG: 'Bevestig',
    HANGENDE: 'Hangende',
    GEKANSELLEER: 'Gekanselleer',
};

export default function MyBookingsTable({ data }: { data: MyRsvp[] }) {
    if (data.length === 0) {
        return (
            <p className="text-xs text-[var(--color-text-subtle)] text-center py-8">
                Jy het nog nie vir enige geleentheid ingeteken nie.
            </p>
        );
    }

    const sorted = [...data].sort((a, b) => {
        const bTime = new Date(b.event?.date ?? b.createdAt).getTime();
        const aTime = new Date(a.event?.date ?? a.createdAt).getTime();
        return bTime - aTime;
    });

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-xs text-[var(--color-text-subtle)] border-b border-[var(--color-border)]">
                        <th className="pb-2 font-medium">Geleentheid</th>
                        <th className="pb-2 font-medium">Datum</th>
                        <th className="pb-2 font-medium">Ligging</th>
                        <th className="pb-2 font-medium">Status</th>
                        <th className="pb-2 font-medium text-right">QR-kode</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                    {sorted.map((r) => (
                        <tr key={r._id} className="hover:bg-[var(--color-bg)]">
                            <td className="py-2.5 text-[var(--color-text)] font-medium">
                                {r.event ? (
                                    <Link href={`/events/${r.event._id}`} className="hover:text-[var(--color-primary)] hover:underline">
                                        {r.event.title}
                                    </Link>
                                ) : (
                                    'Onbekende geleentheid'
                                )}
                            </td>
                            <td className="py-2.5 text-[var(--color-text-subtle)] whitespace-nowrap">
                                {r.event ? formatDateShort(r.event.date) : '—'}
                            </td>
                            <td className="py-2.5 text-[var(--color-text-subtle)] truncate max-w-[10rem]">
                                {r.event?.location ?? '—'}
                            </td>
                            <td className="py-2.5">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[r.status] ?? ''}`}>
                                    {STATUS_LABEL[r.status] ?? r.status}
                                </span>
                            </td>
                            <td className="py-2.5 text-right">
                                <RsvpQrButton
                                    rsvpId={r._id}
                                    eventTitle={r.event?.title ?? 'Geleentheid'}
                                    disabled={r.status === 'GEKANSELLEER'}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
