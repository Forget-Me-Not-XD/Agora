'use client';

import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import type { MonthlyPoint } from '@/lib/chart-utils';

export default function RsvpTrendLineChart({ data }: { data: MonthlyPoint[] }) {
    const latest = data.at(-1);
    const previous = data.at(-2);
    const latestValue = latest?.b ?? 0;
    const deltaPct = previous && previous.b > 0
        ? Math.round(((latestValue - previous.b) / previous.b) * 1000) / 10
        : null;

    const best = data.reduce((max, d) => (d.b > max.b ? d : max), data[0] ?? { label: '--', a: 0, b: 0 });
    const avg = data.length > 0 ? Math.round(data.reduce((s, d) => s + d.b, 0) / data.length) : 0;

    return (
        <div>
            <div className="flex items-baseline gap-2 mb-1">
                <span className="text-xl font-bold text-[var(--color-text)]">{latestValue}</span>
                <span className="text-xs text-[var(--color-text-subtle)]">RSVPs hierdie maand</span>
                {deltaPct !== null && (
                    <span className={`text-xs font-semibold ${deltaPct >= 0 ? 'text-[var(--color-green)]' : 'text-[var(--color-red)]'}`}>
                        {deltaPct >= 0 ? '↑' : '↓'} {Math.abs(deltaPct)}%
                    </span>
                )}
            </div>

            <ResponsiveContainer width="100%" height={90}>
                <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <YAxis hide domain={[0, 'dataMax + 1']} />
                    <Tooltip
                        content={({ active, payload, label }) =>
                            active && payload?.length ? (
                                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 shadow-lg text-xs">
                                    <p className="text-[var(--color-text-subtle)]">{label}</p>
                                    <p className="text-[var(--color-red)] font-semibold">{payload[0].value} RSVPs</p>
                                </div>
                            ) : null
                        }
                    />
                    <Line type="monotone" dataKey="b" stroke="var(--color-red)" strokeWidth={2} dot={false} />
                </LineChart>
            </ResponsiveContainer>

            <p className="text-[11px] text-[var(--color-text-subtle)] mt-1">
                Beste maand: <span className="font-medium text-[var(--color-text)]">{best.label}</span> ({best.b} RSVPs)
                {' · '}Gemiddeld <span className="font-medium text-[var(--color-text)]">{avg}</span> per maand
            </p>
        </div>
    );
}
