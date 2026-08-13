import type { ReactNode } from 'react';
import { TONE_VAR, type Tone } from './Pill';

interface IconChipProps {
    tone?: Tone;
    size?: 'sm' | 'md';
    className?: string;
    children: ReactNode;
}

// Companion to Pill for square icon backgrounds (KPI/stat cards) — same
// tonal color-mix wash so icon chips and label pills read as one system.
export function IconChip({ tone = 'neutral', size = 'md', className = '', children }: IconChipProps) {
    const c = TONE_VAR[tone];
    const sizeClass = size === 'sm' ? 'p-1.5 rounded-lg' : 'p-3 rounded-xl';

    return (
        <div
            className={`inline-flex items-center justify-center shrink-0 ${sizeClass} ${className}`}
            style={{ color: c, backgroundColor: `color-mix(in srgb, ${c} 14%, transparent)` }}
        >
            {children}
        </div>
    );
}
