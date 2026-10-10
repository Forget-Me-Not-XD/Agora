import { apiClient } from './client';
import type { ReviewCategory } from '../lib/review-categories';

// Hou die tipes gelyk aan die web se apps/web/src/lib/api/reviews.ts

export type ReviewEligibilityStatus =
  | 'OPEN'
  | 'NOT_ATTENDED'
  | 'ALREADY_REVIEWED'
  | 'NOT_ENDED'
  | 'CLOSED'
  | 'NO_CATEGORIES';

export interface ReviewableEvent {
  id: string;
  title: string;
  date: string;
  endDate: string | null;
  reviewCategories: ReviewCategory[];
  closesAt: string;
}

// Die backend stuur net die geleentheid saam as die gebruiker daar ingeskandeer is
export interface ReviewEligibility {
  status: ReviewEligibilityStatus;
  event: ReviewableEvent | null;
}

export interface ReviewRatingInput {
  categoryId: string;
  score: number;
}

export interface CreateReviewPayload {
  eventId: string;
  ratings: ReviewRatingInput[];
  comment?: string;
}

export interface ReviewResponse {
  id: string;
  eventId: string;
  ratings: ReviewRatingInput[];
  comment: string | null;
  createdAt: string;
}

// GET /reviews/eligibility/:eventId
export function getReviewEligibility(eventId: string): Promise<ReviewEligibility> {
  return apiClient.get<ReviewEligibility>(`/reviews/eligibility/${encodeURIComponent(eventId)}`);
}

// POST /reviews: 403 nie ingeskandeer nie, 409 reeds beoordeel, 400 buite die venster
// of ongeldige tellings
export function createReview(payload: CreateReviewPayload): Promise<ReviewResponse> {
  return apiClient.post<ReviewResponse, CreateReviewPayload>('/reviews', payload);
}
