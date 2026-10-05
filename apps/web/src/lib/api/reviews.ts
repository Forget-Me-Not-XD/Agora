import { getToken } from '../session';
import { httpErrorMessage } from './http-error';
import type { ReviewCategory } from '../review-categories';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export type ReviewEligibilityStatus =
    | 'OPEN'
    | 'NOT_ATTENDED'
    | 'ALREADY_REVIEWED'
    | 'NOT_ENDED'
    | 'CLOSED'
    | 'NO_CATEGORIES';

export interface ReviewableEvent {
    id:               string;
    title:            string;
    date:             string;
    endDate:          string | null;
    reviewCategories: ReviewCategory[];
    closesAt:         string;
}

// Die backend stuur net die geleentheid saam as die gebruiker daar ingeskandeer is
export interface ReviewEligibility {
    status: ReviewEligibilityStatus;
    event:  ReviewableEvent | null;
}

export interface ReviewRatingInput {
    categoryId: string;
    score:      number;
}

export interface CreateReviewPayload {
    eventId:  string;
    ratings:  ReviewRatingInput[];
    comment?: string;
}

export interface ReviewResponse {
    id:        string;
    eventId:   string;
    ratings:   ReviewRatingInput[];
    comment:   string | null;
    createdAt: string;
}

// Hou die statuskode by, want die action besluit daarop watter boodskap die gebruiker kry
export class ReviewApiError extends Error {
    constructor(message: string, readonly status: number) {
        super(message);
    }
}

async function throwHttpError(res: Response): Promise<never> {
    const body = await res.json().catch(() => ({})) as { message?: string | string[] };
    throw new ReviewApiError(httpErrorMessage(res, body), res.status);
}

// GET /api/v1/reviews/eligibility/:eventId
export async function getReviewEligibility(eventId: string): Promise<ReviewEligibility> {
    const token = getToken();

    const res = await fetch(`${BASE_URL}/api/v1/reviews/eligibility/${encodeURIComponent(eventId)}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        cache:   'no-store',
    });

    if (!res.ok) await throwHttpError(res);
    return res.json() as Promise<ReviewEligibility>;
}

// Net vir geleenthede waar die gebruiker ingeskandeer is. `closed` is die wat hulle nie
// betyds beoordeel het nie, `upcoming` die wat nog nie geëindig het nie.
export interface MyReviewState {
    reviewable: string[];
    reviewed:   string[];
    closed:     string[];
    upcoming:   string[];
}

// GET /api/v1/reviews/mine
export async function getMyReviewState(): Promise<MyReviewState> {
    const token = getToken();

    const res = await fetch(`${BASE_URL}/api/v1/reviews/mine`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        cache:   'no-store',
    });

    if (!res.ok) await throwHttpError(res);
    return res.json() as Promise<MyReviewState>;
}

// POST /api/v1/reviews: 403 nie ingeskandeer nie, 409 reeds beoordeel, 400 buite die venster
export async function createReview(payload: CreateReviewPayload): Promise<ReviewResponse> {
    const token = getToken();

    const res = await fetch(`${BASE_URL}/api/v1/reviews`, {
        method:  'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body:  JSON.stringify(payload),
        cache: 'no-store',
    });

    if (!res.ok) await throwHttpError(res);
    return res.json() as Promise<ReviewResponse>;
}
