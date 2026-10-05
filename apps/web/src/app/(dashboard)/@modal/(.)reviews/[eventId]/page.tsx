import { getReviewEligibility } from '@/lib/api/reviews';
import type { ReviewEligibility } from '@/lib/api/reviews';
import ReviewModal from '@/components/ReviewModal';
import ReviewForm from '@/components/ReviewForm';

export const dynamic = 'force-dynamic';

// Vang /reviews/[eventId] as dit binne die app oopgemaak word, sodat die vorm bo-oor die
// geleentheid wys. 'n Refresh of e-pos-skakel kry steeds die volle bladsy.
export default async function ReviewModalPage({ params }: { params: { eventId: string } }) {
    let eligibility: ReviewEligibility;
    try {
        eligibility = await getReviewEligibility(params.eventId);
    } catch (err) {
        return (
            <ReviewModal title="Beoordeel geleentheid">
                <p className="text-sm text-[var(--color-red)]">
                    {err instanceof Error ? err.message : 'Kon nie die resensie laai nie.'}
                </p>
            </ReviewModal>
        );
    }

    return (
        <ReviewModal title={eligibility.event?.title ?? 'Beoordeel geleentheid'}>
            <ReviewForm eligibility={eligibility} />
        </ReviewModal>
    );
}
