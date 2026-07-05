import type { RsvpStatusCount } from '@/lib/api/analytics';

const STATUS_META: Record<string, { label: string; color: string }> = {
    BEVESTIG: { label: 'Bevestig', color: 'var(--color-green)' },
    HANGENDE: { label: 'Hangende', color: 'var(--color-yellow)' },
    GEKANSELLEER: { label: 'Gekanselleer', color: 'var(--color-red)' },
};

export default function RsvpStatusBreakdown({ data }: { data: RsvpStatusCount[] }) {
    const total = data.reduce((s, d) => s + d.count, 0);

    if (total === 0) {
        return <p className="text-xs text-[var(--color-text-subtle)] text-center py-8">Geen RSVPs beskikbaar nie.</p>;
    }

    return (
        <div>
            {/* Stacked bar */}
            <div className="flex w-full h-3 rounded-full overflow-hidden bg-[var(--color-border)]">
                {data.map((d) => (
                    <div
                        key={d.status}
                        style={{ width: `${(d.count / total) * 100}%`, background: STATUS_META[d.status]?.color ?? 'var(--color-text-subtle)' }}
                        title={`${STATUS_META[d.status]?.label ?? d.status}: ${d.count}`}
                    />
                ))}
            </div>

            {/* Text legend with counts + percentages */}
            <ul className="mt-3 space-y-2">
                {data.map((d) => {
                    const meta = STATUS_META[d.status] ?? { label: d.status, color: 'var(--color-text-subtle)' };
                    const pct = Math.round((d.count / total) * 100);
                    return (
                        <li key={d.status} className="flex items-center gap-2 text-xs">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: meta.color }} />
                            <span className="flex-1 text-[var(--color-text)]">{meta.label}</span>
                            <span className="text-[var(--color-text-subtle)]">{d.count} ({pct}%)</span>
                        </li>
                    );
                })}
            </ul>

            <p className="text-[11px] text-[var(--color-text-subtle)] mt-3 pt-2 border-t border-[var(--color-border)]">
                {total} RSVPs in totaal
            </p>
        </div>
    );
}
