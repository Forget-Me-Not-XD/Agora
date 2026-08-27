'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Trend } from '@/lib/api/analytics';

export default function TrendIndicator({ trend, label }: { trend: Trend | null | undefined; label: string }) {
    if (!trend || trend.deltaPct === null) {
        return (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-text-subtle)]">
                <Minus size={13} /> Geen vorige data
            </span>
        );
    }

    const { direction, deltaPct } = trend;
    const color = direction === 'up' ? 'var(--color-green)' : direction === 'down' ? 'var(--color-red)' : 'var(--color-text-subtle)';
    const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;

    return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color }}>
            <Icon size={13} />
            {deltaPct > 0 ? '+' : ''}{deltaPct}% {label}
        </span>
    );
}