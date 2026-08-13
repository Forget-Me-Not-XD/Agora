'use client';

import { Pill, type Tone } from '@/components/ui/Pill';

export interface AttendanceItem {
    label: string;
    rate: number;
    attended: number;
    registered: number;
}

function rateColors(rate: number): { bar: string; text: string; tone: Tone } {
    if (rate >= 80) return { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', tone: 'green' };
    if (rate >= 50) return { bar: 'bg-amber-400', text: 'text-amber-600 dark:text-amber-400', tone: 'yellow' };
    return { bar: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', tone: 'red' };
}

export default function AttendanceChart({ data }: { data: AttendanceItem[] }) {
    if (data.length === 0) {
        return (
            <p className="text-xs text-[var(--color-text-subtle)] text-center py-8">
                Geen bywoningsdata beskikbaar nie. Statistieke verskyn na afloop van geleenthede.
            </p>
        );
    }

    const avgRate = Math.round(data.reduce((s, d) => s + d.rate, 0) / data.length);
    const avgColors = rateColors(avgRate);

    return (
        <div className="space-y-3">
            {/* Overall average pill */}
            <div className="flex items-center gap-3 pb-3 border-b border-[var(--color-border)]">
                <div className={`text-2xl font-black ${avgColors.text}`}>{avgRate}%</div>
                <div>
                    <p className="text-xs font-semibold text-[var(--color-text)]">Gemiddelde Bywoning</p>
                    <p className="text-xs text-[var(--color-text-subtle)]">oor {data.length} voltooide geleenthede</p>
                </div>
            </div>

            {/* Per-event rows */}
            {data.map((item, i) => {
                const c = rateColors(item.rate);
                return (
                    <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-[var(--color-text)] font-medium truncate flex-1">
                                {item.label.length > 28 ? item.label.slice(0, 26) + '…' : item.label}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-[var(--color-text-subtle)]">
                                    {item.attended}/{item.registered}
                                </span>
                                <Pill tone={c.tone} className="font-bold">{item.rate}%</Pill>
                            </div>
                        </div>
                        <div className="h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${c.bar}`}
                                style={{ width: `${item.rate}%` }}
                            />
                        </div>
                    </div>
                );
            })}

            {/* Legend */}
            <div className="flex flex-wrap gap-3 pt-2 border-t border-[var(--color-border)]">
                {[
                    { color: 'bg-emerald-500', label: '80%+ Uitstekend' },
                    { color: 'bg-amber-400', label: '50–79% Redelik' },
                    { color: 'bg-rose-500', label: '<50% Lae opkoms' },
                ].map((item) => (
                    <span key={item.label} className="flex items-center gap-1.5 text-[16px] text-[var(--color-text-subtle)]">
                        <span className={`w-2.5 h-2.5 rounded-full ${item.color} shrink-0`} />
                        {item.label}
                    </span>
                ))}
            </div>
        </div>
    );
}