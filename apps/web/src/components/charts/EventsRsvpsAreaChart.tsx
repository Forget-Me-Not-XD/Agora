'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TooltipContentProps } from 'recharts';
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

    // Klein bykomende insigte — vul die ruimte onder die grafiek met iets nuttig
    // pleks van net leë kaartruimte.
    const { peakMonth, trend } = useMemo(() => {
        if (data.length === 0) return { peakMonth: null, trend: null };

        const peak = data.reduce((best, d) => (d.b > best.b ? d : best), data[0]);

        const half = Math.floor(data.length / 2) || 1;
        const firstHalfAvg = data.slice(0, half).reduce((s, d) => s + d.b, 0) / half;
        const secondHalfAvg = data.slice(-half).reduce((s, d) => s + d.b, 0) / half;
        const deltaPct = firstHalfAvg > 0 ? Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100) : 0;

        return { peakMonth: peak, trend: deltaPct };
    }, [data]);

    return (
        <div className="h-full flex flex-col">
            {/* Legend + running totals — doubles as a quick-read summary */}
            <div className="flex flex-wrap items-center gap-4 mb-3 shrink-0">
                <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-subtle)]">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'var(--color-blue)' }} />
                    Geleenthede <span className="font-semibold text-[var(--color-text)]">{totalEvents}</span>
                </span>
                <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-subtle)]">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'var(--color-red)' }} />
                    RSVPs <span className="font-semibold text-[var(--color-text)]">{totalRsvps}</span>
                </span>
                <span className="text-xs text-[var(--color-text-subtle)] ml-auto">
                    ~{avgRsvpsPerEvent} RSVPs per geleentheid
                </span>
                <TrendIndicator trend = {trend} label="vs. verlede week" />
            </div>

            <div className="flex-1 min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                        {/* Geleenthede en RSVPs leef op heel ander skale (tientalle vs duisende) —
                            elke reeks kry sy eie y-as sodat die kleiner reeks nie plat langs 0 verdwyn nie. */}
                        <YAxis
                            yAxisId="events"
                            stroke="var(--color-blue)"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                            width={30}
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
                        <Area yAxisId="rsvps" type="monotone" dataKey="b" name="RSVPs" stroke="var(--color-red)" fill="url(#fillRsvps)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {peakMonth && trend !== null && (
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 mt-3 pt-3 border-t border-[var(--color-border)] shrink-0 text-xs text-[var(--color-text-subtle)]">
                    <span>
                        Beste maand: <strong className="text-[var(--color-text)]">{peakMonth.label}</strong> ({peakMonth.b} RSVPs)
                    </span>
                    <span className="flex items-center gap-1.5">
                        Tendens (eerste helfte → laaste helfte):
                        {trend > 5 && <TrendingUp size={13} style={{ color: 'var(--color-green)' }} />}
                        {trend < -5 && <TrendingDown size={13} style={{ color: 'var(--color-red)' }} />}
                        {trend >= -5 && trend <= 5 && <Minus size={13} />}
                        <strong style={{ color: trend > 5 ? 'var(--color-green)' : trend < -5 ? 'var(--color-red)' : 'var(--color-text)' }}>
                            {trend > 0 ? '+' : ''}{trend}%
                        </strong>
                    </span>
                </div>
            )}
        </div>
    );
}
