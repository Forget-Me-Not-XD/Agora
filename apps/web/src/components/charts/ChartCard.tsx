// ========== Imports: ==========
import { ReactNode } from 'react';

interface ChartCardProps {
    title: string;
    subtitle?: string;
    value?: string | number;
    valueLabel?: string;
    className?: string;
    bodyClassName?: string;
    children: ReactNode;
}

export default function ChartCard({
    title,
    subtitle,
    value,
    valueLabel,
    className = '',
    bodyClassName = '',
    children,
}: ChartCardProps) {
    return (
        <div className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 flex flex-col ${className}`}>
            <div className="flex items-start justify-between gap-3 mb-3 shrink-0">
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>
                    {subtitle && <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">{subtitle}</p>}
                </div>
                {value !== undefined && (
                    <div className="text-right shrink-0">
                        <p className="text-xl font-bold text-[var(--color-text)] leading-none">{value}</p>
                        {valueLabel && <p className="text-xs text-[var(--color-text-subtle)] mt-1">{valueLabel}</p>}
                    </div>
                )}
            </div>
            <div className={`flex-1 min-h-0 ${bodyClassName}`}>{children}</div>
        </div>
    );
}