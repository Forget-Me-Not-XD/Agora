import type { LucideIcon } from 'lucide-react';
import { DeltaBadge } from './ui/Badge';

interface StatCardProps {
    label: string;
    value: string | number;
    sub?: string;
    icon: LucideIcon;
    deltaPct?: number | null;
    color?: 'blue' | 'green' | 'orange' | 'red';
}

const COLOR_MAP = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

export default function StatCard({
    label,
    value,
    sub,
    icon: Icon,
    deltaPct,
    color = 'blue',
}: StatCardProps) {
    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 rounded-lg ${COLOR_MAP[color]}`}>
                    <Icon size={14} />
                </div>
                <span className="text-xs text-[var(--color-text-subtle)]">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-[var(--color-text)]">{value}</p>
                {deltaPct !== undefined && <DeltaBadge value={deltaPct} />}
            </div>
            {sub && <p className="text-xs text-[var(--color-text-subtle)] mt-1">{sub}</p>}
        </div>
    );
}