import type { RecentRsvp } from '@/lib/api/analytics';
import type { RsvpStatus } from '@/lib/api/rsvp';
import { Pill } from '@/components/ui/Pill';
import { RSVP_STATUS_LABEL, RSVP_STATUS_TONE } from '@/lib/rsvp-view';

export default function RecentBookingsTable({ data }: { data: RecentRsvp[] }) {
    if (data.length === 0) {
        return (
            <p className="text-xs text-[var(--color-text-subtle)] text-center py-8">
                Geen onlangse besprekings nie.
            </p>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-xs text-[var(--color-text-subtle)] border-b border-[var(--color-border)]">
                        <th className="pb-2 font-medium">Geleentheid</th>
                        <th className="pb-2 font-medium">Gebruiker</th>
                        <th className="pb-2 font-medium">Datum</th>
                        <th className="pb-2 font-medium">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                    {data.map((r) => (
                        <tr key={r.id} className="hover:bg-[var(--color-bg)]">
                            <td className="py-2.5 text-[var(--color-text)] font-medium">{r.eventTitle}</td>
                            <td className="py-2.5 text-[var(--color-text-subtle)]">{r.userName}</td>
                            <td className="py-2.5 text-[var(--color-text-subtle)]">
                                {new Date(r.createdAt).toLocaleDateString('af-ZA')}
                            </td>
                            <td className="py-2.5">
                                <Pill tone={RSVP_STATUS_TONE[r.status as RsvpStatus] ?? 'neutral'}>
                                    {RSVP_STATUS_LABEL[r.status as RsvpStatus] ?? r.status}
                                </Pill>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}