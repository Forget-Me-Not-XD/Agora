import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import { getReviewEligibility, ReviewApiError } from '@/lib/api/reviews';
import type { ReviewEligibility } from '@/lib/api/reviews';
import ReviewForm from '@/components/ReviewForm';

export const dynamic = 'force-dynamic';

// Die volle bladsy, vir die e-pos-skakel of 'n refresh. In die app maak dieselfde URL eerder
// die modal oop (sien @modal/(.)reviews).
export default async function ReviewPage({ params }: { params: { eventId: string } }) {
    const eventHref = `/events/${params.eventId}`;

    let eligibility: ReviewEligibility;
    try {
        eligibility = await getReviewEligibility(params.eventId);
    } catch (err) {
        if (err instanceof ReviewApiError && err.status === 404) notFound();
        const message = err instanceof Error ? err.message : 'Onbekende fout het voorgekom';
        return (
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-10 text-center space-y-3 max-w-lg">
                <AlertCircle size={36} className="mx-auto text-[var(--color-red)]" />
                <p className="text-sm font-semibold text-[var(--color-text)]">Kon nie die resensie laai nie</p>
                <p className="text-xs text-[var(--color-text-subtle)]">{message}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-lg">
            <Link
                href={eventHref}
                className="inline-flex items-center gap-1 text-sm text-[var(--color-text-subtle)] hover:text-[var(--color-primary)] transition-colors"
            >
                <ChevronLeft size={16} /> Terug na geleentheid
            </Link>

            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-5">
                <div>
                    <h1 className="text-xl font-bold text-[var(--color-text)]">Beoordeel geleentheid</h1>
                    {eligibility.event && (
                        <p className="text-sm text-[var(--color-text-subtle)] mt-1">{eligibility.event.title}</p>
                    )}
                </div>

                <ReviewForm eligibility={eligibility} doneHref={eventHref} />
            </div>
        </div>
    );
}
