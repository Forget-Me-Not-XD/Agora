import Link from 'next/link';
import { CheckCircle2, Clock, Star } from 'lucide-react';
import type { ReviewEligibilityStatus } from '@/lib/api/reviews';

interface ReviewEventCardProps {
    eventId: string;
    status:  ReviewEligibilityStatus | null;
}

// Net vir bywoners: 'n knoppie terwyl die venster oop is, anders sê dit waar hulle staan
export default function ReviewEventCard({ eventId, status }: ReviewEventCardProps) {
    if (status !== 'OPEN' && status !== 'ALREADY_REVIEWED' && status !== 'CLOSED' && status !== 'NOT_ENDED') return null;

    return (
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2">
                <Star size={16} className="text-[var(--color-primary)]" />
                <span className="text-sm font-semibold text-[var(--color-text)]">Resensie</span>
            </div>

            {status === 'OPEN' ? (
                <>
                    <p className="text-sm text-[var(--color-text-subtle)]">
                        Hoe was die geleentheid? Jou terugvoer is anoniem.
                    </p>
                    <Link
                        href={`/reviews/${eventId}`}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-[var(--color-primary-text)] rounded-xl text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                        <Star size={15} />
                        Gee resensie
                    </Link>
                </>
            ) : status === 'ALREADY_REVIEWED' ? (
                <div className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text)] rounded-xl text-sm font-medium">
                    <CheckCircle2 size={15} className="text-emerald-500" />
                    Reeds beoordeel
                </div>
            ) : (
                <p className="flex items-center gap-2 text-sm text-[var(--color-text-subtle)]">
                    <Clock size={15} className="shrink-0" />
                    {status === 'CLOSED'
                        ? 'Die resensie-periode vir hierdie geleentheid is verby.'
                        : 'Die resensie-periode begin sodra die geleentheid klaar is.'}
                </p>
            )}
        </div>
    );
}
