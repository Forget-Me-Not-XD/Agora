'use client';

import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import type { BarShapeProps } from 'recharts';
import type { RsvpPerEvent } from '@/lib/api/analytics';

export default function TopEventsBarChart({ data }: { data: RsvpPerEvent[] }) {
    if (data.length === 0) {
        return <p className="text-xs text-[var(--color-text-subtle)] text-center py-8">Geen RSVP-data beskikbaar nie.</p>;
    }

    const total = data.reduce((s, d) => s + d.totalRsvps, 0);

    // Rank the bars by darkening opacity — rank #1 is fully saturated, later ranks fade out.
    function RankedBar({ x, y, width, height, radius, originalDataIndex }: BarShapeProps) {
        const opacity = 1 - originalDataIndex * (0.55 / Math.max(data.length - 1, 1));
        return (
            <rect
                x={x} y={y} width={width} height={height}
                rx={Array.isArray(radius) ? radius[0] : radius} ry={Array.isArray(radius) ? radius[0] : radius}
                fill="var(--color-red)" fillOpacity={opacity}
            />
        );
    }

    return (
        <div>
            <ResponsiveContainer width="100%" height={130}>
                <BarChart data={data} margin={{ top: 20, right: 4, left: 4, bottom: 0 }}>
                    <XAxis dataKey="eventTitle" hide />
                    <Tooltip
                        cursor={{ fill: 'var(--color-border)', opacity: 0.3 }}
                        content={({ active, payload }) =>
                            active && payload?.length ? (
                                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 shadow-lg text-xs">
                                    <p className="text-[var(--color-text)] font-semibold">{payload[0].payload.eventTitle}</p>
                                    <p className="text-[var(--color-text-subtle)]">
                                        {payload[0].value} RSVPs · {Math.round((Number(payload[0].value) / total) * 100)}% van top 5
                                    </p>
                                </div>
                            ) : null
                        }
                    />
                    <Bar dataKey="totalRsvps" radius={[6, 6, 0, 0]} shape={RankedBar}>
                        <LabelList
                            dataKey="totalRsvps"
                            position="top"
                            className="fill-[var(--color-text)] text-[16px] font-semibold"
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            {/* Ranked list — full event names + share of the top 5's combined RSVPs, since the chart itself has no room for labels */}
            <ol className="mt-1 space-y-1.5">
                {data.map((d, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs">
                        <span className="w-4 shrink-0 text-[var(--color-text-subtle)] font-medium">{i + 1}.</span>
                        <span className="flex-1 truncate text-[var(--color-text)]">{d.eventTitle}</span>
                        <span className="shrink-0 text-[var(--color-text-subtle)]">
                            {d.totalRsvps} RSVPs <span className="text-[16px]">({Math.round((d.totalRsvps / total) * 100)}% van top 5)</span>
                        </span>
                    </li>
                ))}
            </ol>
        </div>
    );
}
