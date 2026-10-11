import { roundScore } from '@/lib/review-view';

// Each score is rounded to a tenth first, the same way as the averages, and then grouped by its
// whole number. So a 4,94 becomes 4,9 and lands in 4,0–4,9, while a 4,96 becomes 5,0.
const STARS = [5, 4, 3, 2, 1, 0];

function rangeLabel(star: number): string {
    return star === 5 ? '5,0' : `${star},0–${star},9`;
}

// `scores` holds each review's raw overall score (the average of its categories)
export default function ReviewDistributionChart({ scores }: { scores: number[] }) {
    const counts = new Array<number>(STARS.length).fill(0);
    for (const score of scores) {
        counts[Math.min(5, Math.max(0, Math.floor(roundScore(score))))] += 1;
    }

    return (
        <div className="space-y-2">
            {STARS.map((star) => {
                const count = counts[star];
                const pct = scores.length > 0 ? (count / scores.length) * 100 : 0;

                return (
                    <div key={star} className="flex items-center gap-3">
                        <span className="w-16 shrink-0 text-xs text-[var(--color-text-subtle)] tabular-nums">
                            {rangeLabel(star)}
                        </span>
                        <div className="flex-1 h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                            <div className="h-full bg-[var(--color-star)] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="w-6 shrink-0 text-right text-xs font-semibold text-[var(--color-text)] tabular-nums">
                            {count}
                            <span className="sr-only"> {count === 1 ? 'resensie' : 'resensies'}</span>
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
