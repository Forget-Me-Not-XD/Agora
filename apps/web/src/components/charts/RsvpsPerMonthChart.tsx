'use client';

// ========== Imports: ==========
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { TooltipContentProps } from 'recharts';
import type { MonthlyPoint } from '@/lib/chart-utils';
import { rsvpWord, eventWord } from '@/lib/metrics';

// Vervang die ou twee-as-grafiek (geleenthede teenoor RSVPs) en die RSVP-tendenslyn, wat albei
// dieselfde RSVPs per maand gewys het. Een staaf per maand met die gemiddeld as 'n stippellyn
// is genoeg om te sien of 'n maand goed of swak was.

interface Point extends MonthlyPoint {
    isCurrent: boolean;
}

function ChartTooltip({ active, payload }: TooltipContentProps) {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload as Point;
    const perEvent = point.a > 0 ? (point.b / point.a).toFixed(1).replace('.', ',') : null;

    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 shadow-lg text-xs space-y-0.5">
            <p className="text-[var(--color-text)] font-semibold">
                {point.label}{point.isCurrent && <span className="font-normal text-[var(--color-text-subtle)]"> (nog besig)</span>}
            </p>
            <p className="text-[var(--color-text)]">{point.b} {rsvpWord(point.b)}</p>
            <p className="text-[var(--color-text-subtle)]">
                {point.a} {eventWord(point.a)}
                {perEvent && ` · ${perEvent} RSVPs per geleentheid`}
            </p>
        </div>
    );
}

export default function RsvpsPerMonthChart({ data }: { data: MonthlyPoint[] }) {
    const points: Point[] = data.map((d, i) => ({ ...d, isCurrent: i === data.length - 1 }));
    // Die huidige maand is nog nie klaar nie, so dit tel nie in die gemiddeld nie
    const complete = data.slice(0, -1);
    const average = complete.length > 0 ? complete.reduce((s, d) => s + d.b, 0) / complete.length : 0;

    return (
        <div>
            <div className="w-full h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={points} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis dataKey="label" stroke="var(--color-text-subtle)" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--color-text-subtle)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
                        <Tooltip content={ChartTooltip} cursor={{ fill: 'var(--color-border)', opacity: 0.3 }} />
                        {average > 0 && (
                            <ReferenceLine
                                y={average}
                                stroke="var(--color-text-subtle)"
                                strokeDasharray="5 4"
                                label={{
                                    value: `Gemiddeld ${Math.round(average)}`,
                                    position: 'insideTopRight',
                                    fill: 'var(--color-text-subtle)',
                                    fontSize: 12,
                                }}
                            />
                        )}
                        <Bar dataKey="b" name="RSVPs" radius={[6, 6, 0, 0]}>
                            {points.map((p) => (
                                <Cell key={p.label} fill="var(--color-primary)" fillOpacity={p.isCurrent ? 0.4 : 1} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-[var(--color-text-subtle)]">
                <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: 'var(--color-primary)' }} />
                    RSVPs per maand
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-4 border-t-2 border-dashed shrink-0" style={{ borderColor: 'var(--color-text-subtle)' }} />
                    Maandelikse gemiddeld
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0 opacity-40" style={{ background: 'var(--color-primary)' }} />
                    Hierdie maand (nog besig)
                </span>
            </div>
        </div>
    );
}
