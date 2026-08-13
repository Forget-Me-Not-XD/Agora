// ========== Tonal status pill ==========
// One consistent "pill" style for the whole site: a soft tint of the tone
// colour with a hairline ring in the same hue, derived straight from the
// theme's CSS variables so it adapts automatically to light/dark mode.

export type Tone = 'red' | 'green' | 'blue' | 'yellow' | 'orange' | 'purple' | 'primary' | 'neutral';

export const TONE_VAR: Record<Tone, string> = {
    red:     'var(--color-red)',
    green:   'var(--color-green)',
    blue:    'var(--color-blue)',
    yellow:  'var(--color-yellow)',
    orange:  'var(--color-orange)',
    purple:  'var(--color-purple)',
    primary: 'var(--color-primary)',
    neutral: 'var(--color-text-subtle)',
};

interface PillProps {
    tone?: Tone;
    /** Escape hatch for a raw CSS colour (e.g. from a computed value) instead of a tone key. */
    color?: string;
    dot?: boolean;
    size?: 'sm' | 'md';
    className?: string;
    children: React.ReactNode;
}

export function Pill({ tone = 'neutral', color, dot = false, size = 'sm', className = '', children }: PillProps) {
    const c = color ?? TONE_VAR[tone];
    const sizeClass = size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-sm px-3 py-1.5';

    return (
        <span
            className={`inline-flex items-center gap-1.5 ${sizeClass} rounded-full font-semibold leading-none whitespace-nowrap ${className}`}
            style={{
                color: c,
                backgroundColor: `color-mix(in srgb, ${c} 14%, transparent)`,
                boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${c} 30%, transparent)`,
            }}
        >
            {dot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c }} />}
            {children}
        </span>
    );
}
