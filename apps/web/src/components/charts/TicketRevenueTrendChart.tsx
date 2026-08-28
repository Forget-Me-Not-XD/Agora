'use client';

// ========== Imports: ==========
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TooltipContentProps } from 'recharts';
import type { SingleMonthlyPoint } from '@/lib/chart-utils';
import type { Trend } from '@/lib/api/analytics';
import TrendIndicator from './TrendIndicator';

function fmtRand(v: number): string {
    if (v >= 1_000_000) return `R${(v / 1_000_000).toFixed(1)}m`;
    if (v >= 1_000) return `R${(v / 1_000).toFixed(0)}k`;
    return `R${v.toFixed(2)}`;
}

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 shadow-lg text-xs">
            <p className="text-[var(--color-text-subtle)] mb-1 font-medium">{label}</p>
            <p className="text-[var(--color-primary)] font-semibold">
                Kaartjie-inkomste: {fmtRand(Number(payload[0].value))}
            </p>
        </div>
    );
}

export default function TicketRevenueTrendChart({ data, trend }: { data: SingleMonthlyPoint[]; trend?: Trend | null }) {
    const total = data.reduce((s, d) => s + d.value, 0);
    const avgPerMonth = data.length > 0 ? total / data.length : 0;

    return (
        <div>
            <div className="flex flex-wrap items-center gap-4 mb-3">
                <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-subtle)]">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'var(--color-primary)' }} />
                    Kaartjie-inkomste <span className="font-semibold text-[var(--color-text)]">{fmtRand(total)}</span>
                </span>
                <span className="text-xs text-[var(--color-text-subtle)] ml-auto">
                    ~{fmtRand(avgPerMonth)} per maand
                </span>
                <TrendIndicator trend={trend} label="vs. verlope week" />
            </div>

            <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                        <linearGradient id="fillTicketRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                    <XAxis dataKey="label" stroke="var(--color-text-subtle)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                        stroke="var(--color-text-subtle)"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={fmtRand}
                        width={48}
                    />
                    <Tooltip content={ChartTooltip} />
                    <Area type="monotone" dataKey="value" name="Kaartjie-inkomste" stroke="var(--color-primary)" fill="url(#fillTicketRevenue)" strokeWidth={2} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
