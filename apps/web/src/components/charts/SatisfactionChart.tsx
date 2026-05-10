'use client';

import { Star } from 'lucide-react';

export interface SatisfactionItem {
    label: string;
    rating: number;
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
                <Star
                    key={n}
                    size={size}
                    className={n <= Math.round(rating) ? 'text-amber-400' : 'text-[var(--color-border)]'}
                    fill={n <= Math.round(rating) ? 'currentColor' : 'none'}
                />
            ))}
        </div>
    );
}

export default function SatisfactionChart({ data }: { data: SatisfactionItem[] }) {
    if (data.length === 0) {
        return (
            <p className="text-xs text-[var(--color-text-subtle)] text-center py-8">
                Geen graderings beskikbaar nie. Deelnemers kan geleenthede beoordeel na afloop.
            </p>
        );
    }

    const avg = data.reduce((s, d) => s + d.rating, 0) / data.length;
    const pct = (avg / 5) * 100;

    return (
        <div className="space-y-4">
            {/* Big average display */}
            <div className="flex items-center gap-4 pb-4 border-b border-[var(--color-border)]">
                <div className="relative w-20 h-20 shrink-0">
                    {/* SVG arc gauge */}
                    <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                        <circle cx="40" cy="40" r="32" fill="none" stroke="var(--color-border)" strokeWidth="7" />
                        <circle
                            cx="40" cy="40" r="32"
                            fill="none"
                            stroke="#F59E0B"
                            strokeWidth="7"
                            strokeLinecap="round"
                            strokeDasharray={`${(pct / 100) * 201} 201`}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg font-black text-[var(--color-text)] leading-none">
                            {avg.toFixed(1)}
                        </span>
                        <span className="text-[9px] text-[var(--color-text-subtle)]">uit 5</span>
                    </div>
                </div>
                <div>
                    <Stars rating={avg} size={16} />
                    <p className="text-xs font-semibold text-[var(--color-text)] mt-1">Gemiddelde Bevrediging</p>
                    <p className="text-xs text-[var(--color-text-subtle)]">{data.length} geleenthede beoordeel</p>
                </div>
            </div>

            {/* Per-event ratings */}
            {data.map((item, i) => {
                const barPct = (item.rating / 5) * 100;
                return (
                    <div key={i} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-[var(--color-text)] font-medium truncate flex-1">
                                {item.label.length > 28 ? item.label.slice(0, 26) + '…' : item.label}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                                <Stars rating={item.rating} size={11} />
                                <span className="text-xs font-bold text-amber-500">{item.rating.toFixed(1)}</span>
                            </div>
                        </div>
                        <div className="h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                            <div
                                className="h-full bg-amber-400 rounded-full transition-all"
                                style={{ width: `${barPct}%` }}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}