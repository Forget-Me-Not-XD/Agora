import type { RsvpPerEvent } from '@/lib/api/analytics';
import { rsvpWord } from '@/lib/metrics';

// 'n Gerangskikte lys met 'n staaf per ry. Die ou kolomgrafiek het geen plek vir name gehad nie,
// so dieselfde getalle moes nog 'n keer in 'n lys daaronder staan; hier lees jy naam en getal saam.
export default function TopEventsBarChart({ data }: { data: RsvpPerEvent[] }) {
    if (data.length === 0) {
        return <p className="text-sm text-[var(--color-text-subtle)] text-center py-8">Nog geen RSVPs nie.</p>;
    }

    const max = Math.max(...data.map((d) => d.totalRsvps), 1);

    return (
        <ol className="space-y-3">
            {data.map((d, i) => (
                <li key={`${d.eventTitle}-${i}`} className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="w-4 shrink-0 text-[var(--color-text-subtle)] font-medium tabular-nums">{i + 1}.</span>
                        <span className="flex-1 min-w-0 truncate text-[var(--color-text)]" title={d.eventTitle}>
                            {d.eventTitle}
                        </span>
                        <span className="shrink-0 text-[var(--color-text)] font-semibold tabular-nums">
                            {d.totalRsvps} <span className="font-normal text-[var(--color-text-subtle)]">{rsvpWord(d.totalRsvps)}</span>
                        </span>
                    </div>
                    <div className="ml-6 h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full"
                            style={{ width: `${(d.totalRsvps / max) * 100}%`, background: 'var(--color-primary)' }}
                        />
                    </div>
                </li>
            ))}
        </ol>
    );
}
