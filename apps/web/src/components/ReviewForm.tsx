'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Clock } from 'lucide-react';
import type { ReviewEligibility, ReviewableEvent } from '@/lib/api/reviews';
import { submitReviewAction } from '@/lib/actions/review.actions';
import { REVIEW_BLOCKED_MESSAGE } from '@/lib/review-view';
import { REVIEW_MAX_COMMENT_LENGTH } from '@/lib/review-categories';
import { formatDateLong } from '@/lib/format-date';
import { StarRating } from '@/components/ui/StarRating';
import { useSetReviewModalBusy } from '@/components/ReviewModal';
import successAnim from '@/assets/Success.json';
import warningAnim from '@/assets/Warning_Status.json';
import errorAnim   from '@/assets/Tomato_Error.json';
import loadingAnim from '@/assets/loading.json';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

interface ReviewFormProps {
    eligibility: ReviewEligibility;
    // Op die volle bladsy (bv. uit 'n e-pos) is daar niks om na terug te gaan nie, so dan gaan ons hierheen
    doneHref?:   string;
}

export default function ReviewForm({ eligibility, doneHref }: ReviewFormProps) {
    const router = useRouter();
    const [done, setDone] = useState(false);
    const [error, setError] = useState<{ message: string; expected: boolean } | null>(null);

    function close() {
        if (doneHref) router.push(doneHref);
        else router.back();
    }

    if (done) {
        return (
            <Outcome animation={successAnim} onClose={close}>
                <p className="text-sm font-medium text-[var(--color-text)]">Dankie vir jou terugvoer!</p>
            </Outcome>
        );
    }

    const blocked = eligibility.status === 'OPEN' ? null : REVIEW_BLOCKED_MESSAGE[eligibility.status];
    const message = error?.message ?? blocked;

    if (message || !eligibility.event) {
        const expected = !error || error.expected;
        return (
            <Outcome animation={expected ? warningAnim : errorAnim} onClose={close}>
                <p className={`text-sm font-medium ${expected ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                    {message}
                </p>
            </Outcome>
        );
    }

    return (
        <RatingForm
            event={eligibility.event}
            onCancel={close}
            onSubmitted={() => setDone(true)}
            onError={(message, expected) => setError({ message, expected })}
        />
    );
}

// ========== Vorm ==========

interface RatingFormProps {
    event:       ReviewableEvent;
    onCancel:    () => void;
    onSubmitted: () => void;
    onError:     (message: string, expected: boolean) => void;
}

function RatingForm({ event, onCancel, onSubmitted, onError }: RatingFormProps) {
    // Net in die modal. Op die volle bladsy is dit null.
    const setModalBusy = useSetReviewModalBusy();

    // null is "nog nie gekies nie", want 0 is 'n geldige telling
    const [scores, setScores] = useState<Record<string, number | null>>(
        () => Object.fromEntries(event.reviewCategories.map((category) => [category.id, null])),
    );
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);

    const allRated = event.reviewCategories.every((category) => scores[category.id] !== null);

    function setScore(categoryId: string, score: number) {
        setScores((current) => ({ ...current, [categoryId]: score }));
    }

    async function handleSubmit() {
        if (!allRated) return;

        setLoading(true);
        // Sê dit vir die modal voor die versoek begin, sodat dit nie intussen kan toegaan nie
        setModalBusy?.(true);
        try {
            const result = await submitReviewAction(
                event.id,
                event.reviewCategories.map((category) => ({ categoryId: category.id, score: scores[category.id] ?? 0 })),
                comment,
            );

            if (result.error) onError(result.error, result.expected ?? false);
            else onSubmitted();
        } catch {
            // Die action self het nie geantwoord nie (bv. die verbinding is weg), so dit is 'n regte fout
            onError('Kon nie jou resensie stuur nie. Probeer weer.', false);
        } finally {
            setLoading(false);
            setModalBusy?.(false);
        }
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-subtle)]">
                <Clock size={13} className="shrink-0" />
                <span>Sluit op {formatDateLong(event.closesAt)}</span>
            </div>

            <div className="space-y-4">
                {event.reviewCategories.map((category) => (
                    <CategoryRating
                        key={category.id}
                        name={category.name}
                        score={scores[category.id]}
                        onChange={(score) => setScore(category.id, score)}
                    />
                ))}
            </div>

            <div className="space-y-1.5">
                <label htmlFor="review-comment" className="text-sm font-medium text-[var(--color-text)]">
                    Kommentaar <span className="text-[var(--color-text-subtle)] font-normal">(opsioneel)</span>
                </label>
                <textarea
                    id="review-comment"
                    rows={4}
                    value={comment}
                    maxLength={REVIEW_MAX_COMMENT_LENGTH}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Wat het goed gewerk, en wat kan beter?"
                    className="w-full resize-none bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none focus:border-[var(--color-primary)] transition-colors"
                />
                <p className="text-right text-xs text-[var(--color-text-subtle)]">
                    {comment.length}/{REVIEW_MAX_COMMENT_LENGTH}
                </p>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={onCancel}
                    disabled={loading}
                    className="flex-1 px-4 py-2 rounded-xl text-sm font-medium border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    Kanselleer
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={!allRated || loading}
                    className="flex-1 flex items-center justify-center px-4 py-2 rounded-xl text-sm font-medium bg-[var(--color-primary)] text-[var(--color-primary-text)] hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {loading ? <Lottie animationData={loadingAnim} loop style={{ width: 22, height: 22 }} /> : 'Dien in'}
                </button>
            </div>
        </div>
    );
}

// ========== Een kategorie ==========
// Die sirkel voor die sterre is die 0. StarRating self gebruik 0 vir "skoongemaak", so sonder
// die sirkel sou niemand weet dat hulle 'n 0 kan gee nie.

interface CategoryRatingProps {
    name:     string;
    score:    number | null;
    onChange: (score: number) => void;
}

function CategoryRating({ name, score, onChange }: CategoryRatingProps) {
    const isZero = score === 0;

    return (
        <div className="space-y-1">
            <p className="text-sm font-medium text-[var(--color-text)]">{name}</p>
            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={() => onChange(0)}
                    aria-label={`${name}: 0 sterre`}
                    aria-pressed={isZero}
                    className="p-1 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                >
                    <span
                        className={`block w-5 h-5 rounded-full border-2 transition-colors ${
                            isZero
                                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]'
                                : 'border-[var(--color-text-subtle)]'
                        }`}
                    />
                </button>
                <StarRating
                    value={score ?? 0}
                    onChange={onChange}
                    size={22}
                    label={name}
                    zeroLabel={isZero ? '0 uit 5 sterre' : 'Nog nie gegradeer nie'}
                />
            </div>
            <p className="text-xs text-[var(--color-text-subtle)]">
                {score === null ? 'Nog nie gegradeer nie' : `${score} / 5`}
            </p>
        </div>
    );
}

// ========== Sukses of fout ==========

interface OutcomeProps {
    animation: unknown;
    onClose:   () => void;
    children:  React.ReactNode;
}

function Outcome({ animation, onClose, children }: OutcomeProps) {
    return (
        <div className="flex flex-col items-center text-center space-y-3">
            <Lottie animationData={animation} loop={false} style={{ width: 96, height: 96 }} />
            {children}
            <button
                onClick={onClose}
                className="w-full px-4 py-2 rounded-xl text-sm font-medium border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors"
            >
                Terug na geleentheid
            </button>
        </div>
    );
}
