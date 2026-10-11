import { StarRating } from '@/components/ui/StarRating';
import { formatScore, roundScore } from '@/lib/review-view';

export interface SatisfactionItem {
    label: string;
    // Raw 0–5 average; rounding to a tenth happens here, for display only
    rating: number;
}

interface SatisfactionChartProps {
    data: SatisfactionItem[];
    // Passed in rather than worked out from the rows, so the big number is the backend's own average
    average: number;
    reviewCount: number;
}

// Both the arc and the bars use the rounded score, so they match the number next to them
function percentOfMax(score: number): number {
    return (roundScore(score) / 5) * 100;
}

// Screen readers get each score once, from StarRating's aria-label, so the visible copies of the
// same name and number are hidden from them
export default function SatisfactionChart({ data, average, reviewCount }: SatisfactionChartProps) {
    return (
        <div className="space-y-4">
            {/* Big average display */}
            <div className="flex items-center gap-4 pb-4 border-b border-[var(--color-border)]">
                <div className="relative w-20 h-20 shrink-0" aria-hidden="true">
                    {/* SVG arc gauge */}
                    <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
                        <circle cx="40" cy="40" r="32" fill="none" stroke="var(--color-border)" strokeWidth="7" />
                        {/* A round cap draws a dot even when the arc has no length, so 0,0 gets no arc at all */}
                        {roundScore(average) > 0 && (
                            <circle
                                cx="40" cy="40" r="32"
                                fill="none"
                                stroke="var(--color-star)"
                                strokeWidth="7"
                                strokeLinecap="round"
                                strokeDasharray={`${(percentOfMax(average) / 100) * 201} 201`}
                            />
                        )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg font-black text-[var(--color-text)] leading-none">
                            {formatScore(average)}
                        </span>
                        <span className="text-xs text-[var(--color-text-subtle)]">uit 5</span>
                    </div>
                </div>
                <div>
                    <StarRating value={average} size={24} label="Algehele gemiddeld" />
                    <p className="text-xs font-semibold text-[var(--color-text)] mt-1" aria-hidden="true">Algehele gemiddeld</p>
                    <p className="text-xs text-[var(--color-text-subtle)]">
                        {reviewCount} {reviewCount === 1 ? 'resensie' : 'resensies'}
                    </p>
                </div>
            </div>

            {/* Per-category ratings */}
            {data.map((item) => (
                <div key={item.label} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-[var(--color-text)] font-medium truncate flex-1 min-w-0" title={item.label} aria-hidden="true">
                            {item.label}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                            <StarRating value={item.rating} size={18} label={item.label} />
                            <span className="text-xs font-bold text-[var(--color-text)]" aria-hidden="true">{formatScore(item.rating)}</span>
                        </div>
                    </div>
                    <div className="h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[var(--color-star)] rounded-full transition-all"
                            style={{ width: `${percentOfMax(item.rating)}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
