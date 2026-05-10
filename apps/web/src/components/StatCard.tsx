// ========== Imports: ==========
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
    label: string;
    value: string | number;
    sub?: string;
    icon: LucideIcon;
    color?: 'blue' | 'green' | 'orange' | 'red';
}

const COLOR_MAP = {
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
}

export default function StatCard({
    label,
    value,
    sub,
    icon: Icon,
    color = 'blue',
}: StatCardProps) {
    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 flex items-start gap-4">
        <div className={`p-3 rounded-xl ${COLOR_MAP[color]}`}>
        <Icon size={20} />
        </div>
        <div>
        <p className="text-xs text-[var(--color-text-subtle)] mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-[var(--color-text)]">{value}</p>
        {sub && <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">{sub}</p>}
        </div>
    </div>
    );
}