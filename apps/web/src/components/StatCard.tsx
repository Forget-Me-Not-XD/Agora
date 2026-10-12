import type { LucideIcon } from 'lucide-react';
import { DeltaBadge } from './ui/Badge';
import { IconChip } from './ui/IconChip';

interface StatCardProps {
    label: string;
    value: string | number;
    sub?: string;
    icon: LucideIcon;
    deltaPct?: number | null;
    deltaLabel?: string;
    color?: 'blue' | 'green' | 'orange' | 'red';
}

export default function StatCard({
    label,
    value,
    sub,
    icon: Icon,
    deltaPct,
    deltaLabel = 'vs. verlede maand',
    color = 'blue',
}: StatCardProps) {
    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
                <IconChip tone={color} size="sm">
                    <Icon size={14} />
                </IconChip>
                <span className="text-xs text-[var(--color-text-subtle)]">{label}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-2xl font-bold text-[var(--color-text)]">{value}</p>
                {deltaPct !== undefined && (
                    <span className="flex items-center gap-1.5">
                        <DeltaBadge value={deltaPct} />
                        <span className="text-[11px] text-[var(--color-text-subtle)]">{deltaLabel}</span>
                    </span>
                )}
            </div>
            {sub && <p className="text-xs text-[var(--color-text-subtle)] mt-1">{sub}</p>}
        </div>
    );
}