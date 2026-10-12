// ========== Imports: ==========
import Link from 'next/link';
import { ChevronRight, Star } from 'lucide-react';
import type { PendingReview } from '@/lib/api/reviews';
import { formatDateShort } from '@/lib/format-date';
import { daysLeftLabel } from '@/lib/review-view';
import { IconChip } from '@/components/ui/IconChip';
import { Pill } from '@/components/ui/Pill';

// Herinner bywoners aan geleenthede wat hulle nog kan beoordeel. Is daar niks hangend nie, wys
// die kaart glad nie. Die skakels maak die resensie as 'n modal bo-oor die dashboard oop.
export default function PendingReviewsCard({ reviews }: { reviews: PendingReview[] }) {
    if (reviews.length === 0) return null;

    const now = Date.now();

    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
                <IconChip tone="primary" size="sm">
                    <Star size={16} />
                </IconChip>
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-[var(--color-text)]">
                        Hangende Resensies <span className="text-[var(--color-text-subtle)] font-normal">({reviews.length})</span>
                    </h2>
                    <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">
                        Hoe was dit? Jou terugvoer is anoniem.
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                {reviews.map((review) => (
                    <Link
                        key={review.eventId}
                        href={`/reviews/${review.eventId}`}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-primary)] transition-colors"
                    >
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[var(--color-text)] truncate">{review.title}</p>
                            <p className="text-xs text-[var(--color-text-subtle)] mt-0.5">{formatDateShort(review.date)}</p>
                        </div>
                        <Pill tone="primary">{daysLeftLabel(review.closesAt, now)}</Pill>
                        <ChevronRight size={16} className="shrink-0 text-[var(--color-text-subtle)]" />
                    </Link>
                ))}
            </div>
        </div>
    );
}
