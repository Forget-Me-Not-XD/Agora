'use server';

import { revalidatePath } from 'next/cache';
import { createReview, getMyReviewState, ReviewApiError } from '@/lib/api/reviews';
import type { MyReviewState, ReviewRatingInput } from '@/lib/api/reviews';
import { REVIEW_BLOCKED_MESSAGE } from '@/lib/review-view';

export interface SubmitReviewResult {
    error?:    string;
    // 403, 409 en 400 is dinge wat kan gebeur (oranje), nie stelselfoute nie (rooi)
    expected?: boolean;
}

export async function submitReviewAction(
    eventId: string,
    ratings: ReviewRatingInput[],
    comment: string,
): Promise<SubmitReviewResult> {
    try {
        await createReview({ eventId, ratings, comment: comment.trim() || undefined });
    } catch (err) {
        if (err instanceof ReviewApiError) {
            if (err.status === 403) return { error: REVIEW_BLOCKED_MESSAGE.NOT_ATTENDED, expected: true };
            if (err.status === 409) return { error: REVIEW_BLOCKED_MESSAGE.ALREADY_REVIEWED, expected: true };
            // Die backend se 400 sê presies wat fout is (venster gesluit, nog nie geëindig nie, ...)
            if (err.status === 400) return { error: err.message.replace(/^\[\d+\]\s*/, ''), expected: true };
        }
        return { error: err instanceof Error ? err.message : 'Kon nie jou resensie stuur nie.' };
    }

    // Die "Gee resensie"-knoppie op die geleentheid moet weg wees as die gebruiker terugkom
    revalidatePath(`/events/${eventId}`);
    return {};
}

export interface MyReviewStateResult {
    state?: MyReviewState;
    error?: string;
}

export async function getMyReviewStateAction(): Promise<MyReviewStateResult> {
    try {
        return { state: await getMyReviewState() };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Kon nie jou resensies laai nie.' };
    }
}
