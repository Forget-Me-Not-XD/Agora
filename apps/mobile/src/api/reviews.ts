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

// Geleenthede wat die gebruiker bygewoon het en nog kan beoordeel. Die een wat eerste sluit, kom eerste.
export interface PendingReview {
  eventId: string;
  title: string;
  date: string;
  endDate: string | null;
  reviewCategories: ReviewCategory[];
  closesAt: string;
}

// GET /reviews/pending
export function getPendingReviews(): Promise<PendingReview[]> {
  return apiClient.get<PendingReview[]>('/reviews/pending');
}

export interface CategorySummary {
  id: string;
  name: string;
  // Net null as niemand die kategorie nog beoordeel het nie
  avg: number | null;
  // Hoeveel keer elke telling van 0 tot 5 gegee is
  distribution: number[];
}

// Anoniem: die backend stuur nie saam wie dit geskryf het nie
export interface ReviewComment {
  comment: string;
  createdAt: string;
}

// Die gemiddeldes kom rou van die backend af. Rond dit af met roundScore of formatScore.
export interface ReviewSummary {
  count: number;
  overallAvg: number | null;
  categories: CategorySummary[];
  // Nuutste eerste
  comments: ReviewComment[];
  // Elke resensie se algehele telling, van laag na hoog
  reviewScores: number[];
}

// GET /reviews/event/:eventId: net vir die skepper van die geleentheid of 'n admin
export function getReviewSummary(eventId: string): Promise<ReviewSummary> {
  return apiClient.get<ReviewSummary>(`/reviews/event/${encodeURIComponent(eventId)}`);
}

// POST /reviews: 403 nie ingeskandeer nie, 409 reeds beoordeel, 400 buite die venster
// of ongeldige tellings
export function createReview(payload: CreateReviewPayload): Promise<ReviewResponse> {
  return apiClient.post<ReviewResponse, CreateReviewPayload>('/reviews', payload);
}
