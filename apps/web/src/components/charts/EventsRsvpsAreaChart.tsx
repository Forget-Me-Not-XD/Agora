'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TooltipContentProps } from 'recharts';
import type { MonthlyPoint } from '@/lib/chart-utils';

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

export default function EventsRsvpsAreaChart({ data }: { data: MonthlyPoint[] }) {
    const totalEvents = data.reduce((s, d) => s + d.a, 0);
    const totalRsvps = data.reduce((s, d) => s + d.b, 0);
    const avgRsvpsPerEvent = totalEvents > 0 ? (totalRsvps / totalEvents).toFixed(1) : '0';

    return (
        <div>
            {/* Legend + running totals — doubles as a quick-read summary */}
            <div className="flex flex-wrap items-center gap-4 mb-3">
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
            </div>

            <ResponsiveContainer width="100%" height={260}>
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
                    <YAxis stroke="var(--color-text-subtle)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={ChartTooltip} />
                    <Area type="monotone" dataKey="a" name="Geleenthede" stroke="var(--color-blue)" fill="url(#fillEvents)" strokeWidth={2} />
                    <Area type="monotone" dataKey="b" name="RSVPs" stroke="var(--color-red)" fill="url(#fillRsvps)" strokeWidth={2} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
