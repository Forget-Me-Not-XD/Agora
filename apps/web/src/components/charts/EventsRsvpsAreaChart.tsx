'use client';

// ========== Imports: ==========
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TooltipContentProps, DotItemDotProps } from 'recharts';
import type { MonthlyPoint } from '@/lib/chart-utils';
import type { Trend } from '@/lib/api/analytics';
import TrendIndicator from './TrendIndicator';

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 shadow-lg text-xs">
            <p className="text-[var(--color-text-subtle)] mb-1 font-medium">{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color }} className="font-semibold">
                    {p.name}: {p.value}
                </p>
            ))}
        </div>
    );
}

export default function EventsRsvpsAreaChart({ data, trend }: { data: MonthlyPoint[]; trend?: Trend | null }) {
    const totalEvents = data.reduce((s, d) => s + d.a, 0);
    const totalRsvps = data.reduce((s, d) => s + d.b, 0);
    const avgRsvpsPerEvent = totalEvents > 0 ? (totalRsvps / totalEvents).toFixed(1) : '0';

    const { anomalyIndices, anomalyMonths, declineIndices, declineMonths } = useMemo(() => {
        if (data.length === 0) {
            return {
                anomalyIndices: new Set<number>(),
                anomalyMonths: [] as string[],
                declineIndices: new Set<number>(),
                declineMonths: [] as string[],
            };
        }

        const avgEvents = data.reduce((s, d) => s + d.a, 0) / data.length;
        const avgRsvps = data.reduce((s, d) => s + d.b, 0) / data.length;
        const eventsStdDev = Math.sqrt(data.reduce((s, d) => s + (d.a - avgEvents) ** 2, 0) / data.length);
        const rsvpsStdDev = Math.sqrt(data.reduce((s, d) => s + (d.b - avgRsvps) ** 2, 0) / data.length);

        const scored = data.map((d, index) => {
            const eventsZ = eventsStdDev > 0 ? (d.a - avgEvents) / eventsStdDev : 0;
            const rsvpsZ = rsvpsStdDev > 0 ? (d.b - avgRsvps) / rsvpsStdDev : 0;
            return { label: d.label, index, divergence: rsvpsZ - eventsZ };
        });

        const DIVERGENCE_FLOOR = 1;
        const MAX_MARKERS_PER_SIDE = 3;

        const anomalies = scored
            .filter((s) => s.divergence >= DIVERGENCE_FLOOR)
            .sort((x, y) => y.divergence - x.divergence)
            .slice(0, MAX_MARKERS_PER_SIDE);

        const declines = scored
            .filter((s) => s.divergence <= -DIVERGENCE_FLOOR)
            .sort((x, y) => x.divergence - y.divergence)
            .slice(0, MAX_MARKERS_PER_SIDE);

        return {
            anomalyIndices: new Set(anomalies.map((x) => x.index)),
            anomalyMonths: anomalies.map((x) => x.label),
            declineIndices: new Set(declines.map((x) => x.index)),
            declineMonths: declines.map((x) => x.label),
        };
    }, [data]);

    function renderRsvpDot(props: DotItemDotProps): ReactNode {
        const { cx, cy, index } = props;
        if (cx === undefined || cy === undefined || index === undefined) {
            return <circle key={`dot-${index}`} r={0} />;
        }

        if (anomalyIndices.has(index)) {
            return (
                <g key={`anomaly-${index}`}>
                    <circle cx={cx} cy={cy} r={9} fill="var(--color-surface)" stroke="var(--color-purple)" strokeWidth={2} />
                    <circle cx={cx} cy={cy} r={3.5} fill="var(--color-purple)" />
                    <text x={cx} y={cy - 14} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--color-purple)">
                        Ondersoek
                    </text>
                </g>
            );
        }

        if (declineIndices.has(index)) {
            return (
                <g key={`decline-${index}`}>
                    <circle cx={cx} cy={cy} r={9} fill="var(--color-surface)" stroke="var(--color-orange)" strokeWidth={2} />
                    <circle cx={cx} cy={cy} r={3.5} fill="var(--color-orange)" />
                    <text x={cx} y={cy - 14} textAnchor="middle" fontSize={10} fontWeight={700} fill="var(--color-orange)">
                        Daling
                    </text>
                </g>
            );
        }

        return <circle key={`dot-${index}`} r={0} />;
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex flex-wrap items-center gap-4 mb-3 shrink-0">
                <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-subtle)]">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'var(--color-blue)' }} />
                    Geleenthede <span className="font-semibold text-[var(--color-text)]">{totalEvents}</span>
                </span>
                <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-subtle)]">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'var(--color-red)' }} />
                    RSVPs <span className="font-semibold text-[var(--color-text)]">{totalRsvps}</span>
                </span>
                {anomalyMonths.length > 0 && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-purple)]">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-[var(--color-purple)]" style={{ background: 'var(--color-surface)' }} />
                        Ongewone doeltreffendheid gemerk
                    </span>
                )}
                {declineMonths.length > 0 && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-orange)]">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-[var(--color-orange)]" style={{ background: 'var(--color-surface)' }} />
                        Skerp RSVP-daling gemerk
                    </span>
                )}
                <span className="text-xs text-[var(--color-text-subtle)] ml-auto">
                    ~{avgRsvpsPerEvent} RSVPs per geleentheid
                </span>
                <TrendIndicator trend={trend} label="vs. verlede week" />
            </div>

            <div className="flex-1 min-h-0 flex items-center">
                <div className="w-full aspect-[3/1] max-h-[320px] min-h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="fillEvents" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-blue)" stopOpacity={0.35} />
                                    <stop offset="95%" stopColor="var(--color-blue)" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="fillRsvps" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--color-red)" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="var(--color-red)" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                            <XAxis dataKey="label" stroke="var(--color-text-subtle)" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis
                                yAxisId="events"
                                stroke="var(--color-blue)"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                allowDecimals={false}
                                width={34}
                            />
                            <YAxis
                                yAxisId="rsvps"
                                orientation="right"
                                stroke="var(--color-red)"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                allowDecimals={false}
                                width={36}
                            />
                            <Tooltip content={ChartTooltip} />
                            <Area yAxisId="events" type="monotone" dataKey="a" name="Geleenthede" stroke="var(--color-blue)" fill="url(#fillEvents)" strokeWidth={2} />
                            <Area yAxisId="rsvps" type="monotone" dataKey="b" name="RSVPs" stroke="var(--color-red)" fill="url(#fillRsvps)" strokeWidth={2} dot={renderRsvpDot} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
