// ========== Imports: ==========
import { ReactNode } from 'react';
import { ChartHelpButton, ChartInsight, type ChartHelpContent } from './ChartHelp';

interface ChartCardProps {
    title: string;
    subtitle?: string;
    value?: string | number;
    valueLabel?: string;
    /** Een sin wat sê wat die grafiek beteken, bo die grafiek gewys */
    insight?: string | null;
    /** Die ⓘ-verduideliking langs die titel */
    help?: ChartHelpContent;
    className?: string;
    bodyClassName?: string;
    children: ReactNode;
}

export default function ChartCard({
    title,
    subtitle,
    value,
    valueLabel,
    insight,
    help,
    className = '',
    bodyClassName = '',
    children,
}: ChartCardProps) {
    return (
        <div className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 flex flex-col ${className}`}>
            <div className="flex items-start justify-between gap-3 mb-3 shrink-0">
                <div className="min-w-0">
                    <div className="flex items-center gap-1">
                        <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>
                        {help && <ChartHelpButton help={help} />}
                    </div>
                    {subtitle && <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">{subtitle}</p>}
                </div>
                {value !== undefined && (
                    <div className="text-right shrink-0">
                        <p className="text-xl font-bold text-[var(--color-text)] leading-none">{value}</p>
                        {valueLabel && <p className="text-xs text-[var(--color-text-subtle)] mt-1">{valueLabel}</p>}
                    </div>
                )}
            </div>
            {insight && (
                <div className="mb-4 shrink-0">
                    <ChartInsight text={insight} />
                </div>
            )}
            <div className={`flex-1 min-h-0 ${bodyClassName}`}>{children}</div>
        </div>
    );
}
