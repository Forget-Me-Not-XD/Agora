import type { RecentRsvp } from '@/lib/api/analytics';

const STATUS_STYLE: Record<string, string> = {
    BEVESTIG: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    HANGENDE: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    GEKANSELLEER: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

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
                        <th className="pb-2 font-medium text-right">Ingeboek</th>
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
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[r.status] ?? ''}`}>
                                    {r.status}
                                </span>
                            </td>
                            <td className="py-2.5 text-right">{r.checkedIn ? '✓' : '—'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}