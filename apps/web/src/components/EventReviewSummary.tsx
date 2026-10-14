import { Star } from 'lucide-react';
import type { ReviewSummary } from '@/lib/api/reviews';
import { REVIEW_BLOCKED_MESSAGE } from '@/lib/review-view';
import SatisfactionChart from '@/components/charts/SatisfactionChart';
import ReviewDistributionChart from '@/components/charts/ReviewDistributionChart';
import ReviewCommentList from '@/components/ReviewCommentList';

interface EventReviewSummaryProps {
    // null beteken die opsomming kon nie gelaai word nie
    summary: ReviewSummary | null;
}

// Wat bywoners van die geleentheid gedink het, net vir wie dit bestuur. Alles hier is anoniem.
export default function EventReviewSummary({ summary }: EventReviewSummaryProps) {
    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2">
                <Star size={16} className="text-[var(--color-primary)]" />
                <span className="text-sm font-semibold text-[var(--color-text)]">Resensies</span>
            </div>

            <SummaryBody summary={summary} />
        </div>
    );
}

function SummaryBody({ summary }: EventReviewSummaryProps) {
    if (!summary) {
        return <p className="text-sm font-medium text-red-600 dark:text-red-400">Kon nie die resensies laai nie.</p>;
    }

    if (summary.count === 0 || summary.overallAvg === null) {
        return (
            <p className="text-sm text-[var(--color-text-subtle)]">
                {summary.categories.length === 0
                    ? REVIEW_BLOCKED_MESSAGE.NO_CATEGORIES
                    : 'Nog geen resensies nie. Bywoners wat ingeskandeer is, kan die geleentheid beoordeel sodra dit klaar is.'}
            </p>
        );
    }

    // 'n Kategorie se avg is net null as niemand dit beoordeel het nie. Sodra daar resensies is, kan
    // dit nie meer gebeur nie: die eerste resensie sluit die kategorieë, en elke resensie beoordeel almal.
    const categories = summary.categories.flatMap((category) =>
        category.avg === null ? [] : [{ label: category.name, rating: category.avg }],
    );

    return (
        <>
            {/* Eers vanaf lg langs mekaar: as dit smaller is, word die kategorienames afgesny */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SatisfactionChart data={categories} average={summary.overallAvg} reviewCount={summary.count} />

                <div className="space-y-3">
                    <div>
                        <p className="text-sm font-semibold text-[var(--color-text)]">Verspreiding</p>
                        <p className="text-xs text-[var(--color-text-subtle)]">Elke resensie se algehele telling</p>
                    </div>
                    <ReviewDistributionChart scores={summary.reviewScores} />
                </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-[var(--color-border)]">
                <p className="text-sm font-semibold text-[var(--color-text)]">Kommentaar</p>
                <ReviewCommentList comments={summary.comments.map((item) => item.comment)} />
            </div>
        </>
    );
}
