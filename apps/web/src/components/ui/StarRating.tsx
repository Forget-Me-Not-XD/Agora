'use client';

import { useState, type KeyboardEvent } from 'react';
import { Star } from 'lucide-react';

// ========== Star rating ==========
// Two modes from one component: pass onChange and it becomes an interactive
// 0–5 picker (clicking the current star clears it back to 0); leave it out
// and it's a read-only display that can show fractions like 4.3.

const MAX = 5;
const FILLED = 'var(--color-star)';
const EMPTY = 'var(--color-text-subtle)';

interface StarRatingProps {
    value: number;
    onChange?: (value: number) => void;
    size?: number;
    label?: string;
    // Wat 'n skermleser by 0 sê. Waar 0 'n regte telling is, gee die ouer dit self.
    zeroLabel?: string;
    className?: string;
}

function clamp(value: number): number {
    if (Number.isNaN(value)) return 0;
    return Math.min(MAX, Math.max(0, value));
}

// Afrikaans uses a decimal comma, so 4.3 is read out as "4,3".
function formatRating(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
}

function StarIcon({ fill, size, preview }: { fill: number; size: number; preview: boolean }) {
    return (
        <span className="relative block shrink-0" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0" style={{ color: EMPTY }} />
            {fill > 0 && (
                // Clipping a filled star to a percentage of its width is what
                // lets read-only mode show 4.3 without half-star icons.
                <span
                    className="absolute inset-y-0 left-0 overflow-hidden"
                    style={{ width: `${fill * 100}%`, opacity: preview ? 0.45 : 1 }}
                >
                    <Star size={size} fill="currentColor" style={{ color: FILLED }} />
                </span>
            )}
        </span>
    );
}

export function StarRating({ value, onChange, size = 20, label = 'Gradering', zeroLabel = 'Geen gradering', className = '' }: StarRatingProps) {
    const [hovered, setHovered] = useState<number | null>(null);

    if (!onChange) {
        const rating = Math.round(clamp(value) * 10) / 10;

        return (
            <div
                role="img"
                aria-label={`${label}: ${formatRating(rating)} uit ${MAX} sterre`}
                className={`inline-flex items-center gap-0.5 ${className}`}
            >
                {Array.from({ length: MAX }, (_, i) => (
                    <StarIcon key={i} fill={Math.min(1, Math.max(0, rating - i))} size={size} preview={false} />
                ))}
            </div>
        );
    }

    const change = onChange;
    const rating = Math.round(clamp(value));
    // Hovering the current star previews the clear, since clicking it resets to 0.
    const shown = hovered === rating ? 0 : (hovered ?? rating);

    function select(n: number) {
        // Clear the hover preview so the new value shows straight away.
        setHovered(null);
        change(n === rating ? 0 : n);
    }

    function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
        const next: Record<string, number> = {
            ArrowRight: Math.min(MAX, rating + 1),
            ArrowUp:    Math.min(MAX, rating + 1),
            ArrowLeft:  Math.max(0, rating - 1),
            ArrowDown:  Math.max(0, rating - 1),
            Home:       0,
            End:        MAX,
        };
        if (!(e.key in next)) return;

        e.preventDefault();
        if (next[e.key] !== rating) change(next[e.key]);
    }

    // The whole row is a single slider for keyboard and screen-reader users,
    // so the individual stars are mouse/touch targets only.
    return (
        <div
            role="slider"
            tabIndex={0}
            aria-label={label}
            aria-valuemin={0}
            aria-valuemax={MAX}
            aria-valuenow={rating}
            aria-valuetext={rating === 0 ? zeroLabel : `${rating} uit ${MAX} sterre`}
            onKeyDown={handleKeyDown}
            onPointerLeave={() => setHovered(null)}
            className={`inline-flex items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${className}`}
        >
            {Array.from({ length: MAX }, (_, i) => {
                const n = i + 1;
                return (
                    <span
                        key={n}
                        aria-hidden="true"
                        className="p-1 cursor-pointer"
                        // Touch screens fire enter events on tap, which would
                        // leave a preview stuck on — only real mice get one.
                        onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHovered(n); }}
                        onClick={() => select(n)}
                    >
                        <StarIcon fill={n <= shown ? 1 : 0} size={size} preview={hovered !== null} />
                    </span>
                );
            })}
        </div>
    );
}
