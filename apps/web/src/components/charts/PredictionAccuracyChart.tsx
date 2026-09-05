'use client';

// ========== Imports: ==========
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TooltipContentProps } from 'recharts';
import type { PredictionAccuracyItem } from '@/lib/api/analytics';

interface AccuracyPoint {
    index:        number;
    title:        string;
    predictedPct: number;
    actualPct:    number;
}

function AccuracyTooltip({ active, payload }: TooltipContentProps) {
    if (!active || !payload?.length) return null;
    const point = payload[0].payload as AccuracyPoint;
    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3 py-2 shadow-lg text-xs">
            <p className="text-[var(--color-text)] font-semibold mb-1">{point.title}</p>
            <p style={{ color: 'var(--color-blue)' }} className="font-semibold">Voorspel: {point.predictedPct}%</p>
            <p style={{ color: 'var(--color-green)' }} className="font-semibold">Werklik: {point.actualPct}%</p>
        </div>
    );
}

export default function PredictionAccuracyChart({ items }: { items: PredictionAccuracyItem[] }) {
    const data: AccuracyPoint[] = items.map((item, i) => ({
        index: i + 1,
        title: item.title,
        predictedPct: Math.round(item.predictedFillRate * 100),
        actualPct: Math.round(item.actualFillRate * 100),
    }));

    return (
        <div>
            <div className="flex items-center gap-4 mb-3">
                <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-subtle)]">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'var(--color-blue)' }} />
                    Voorspelde vulkoers
                </span>
                <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-subtle)]">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: 'var(--color-green)' }} />
                    Werklike vulkoers
                </span>
            </div>

            <ResponsiveContainer width="100%" height={Math.max(180, data.length * 46)}>
                <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} stroke="var(--color-text-subtle)" fontSize={11} tickLine={false} axisLine={false} unit="%" />
                    <YAxis type="category" dataKey="index" stroke="var(--color-text-subtle)" fontSize={11} tickLine={false} axisLine={false} width={28} tickFormatter={(v) => `#${v}`} />
                    <Tooltip content={AccuracyTooltip} cursor={{ fill: 'var(--color-border)', opacity: 0.3 }} />
                    <Bar dataKey="predictedPct" fill="var(--color-blue)" radius={[0, 4, 4, 0]} barSize={12} />
                    <Bar dataKey="actualPct" fill="var(--color-green)" radius={[0, 4, 4, 0]} barSize={12} />
                </BarChart>
            </ResponsiveContainer>

            <ol className="mt-2 space-y-1 text-xs text-[var(--color-text-subtle)]">
                {data.map((d) => (
                    <li key={d.index} className="flex items-center gap-2">
                        <span className="w-6 shrink-0 font-medium">#{d.index}</span>
                        <span className="truncate">{d.title}</span>
                    </li>
                ))}
            </ol>
        </div>
    );
}
