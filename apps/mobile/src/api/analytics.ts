// ========== Imports: ==========
import { apiClient } from "./client";

export interface EventsPerMonth {
    year: number;
    month: number;
    count: number;
}

export interface TopEvent {
    eventTitle: string;
    totalRsvps: number;
}

export interface EventsSummary {
    eventsPerMonth: EventsPerMonth[];
    top5Events: TopEvent[];
}

// GET /analytics/events-summary -- ADMIN-only op die backend
export async function getEventsSummary(): Promise<EventsSummary> {
    return apiClient.get<EventsSummary>('/analytics/events-summary');
}

export interface PredictionResult {
    predictedFillRate: number;
    estimatedRsvps: number;
    predictedNoShowRate: number;
    estimatedAttendees: number;
    estimatedBudgetZAR: number;
    reasoning: string[];
}

export interface PredictDraftPayload {
    date: string;
    maxCapacity: number;
}

// POST /analytics/predict-draft -- slegs ADMIN/DOSENT, 503 as die model nie beskikbaar is nie
export async function getDraftPrediction(payload: PredictDraftPayload): Promise<PredictionResult> {
    return apiClient.post<PredictionResult, PredictDraftPayload>('/analytics/predict-draft', payload);
}

// GET /analytics/prediction?eventId=X -- voorspelling vir 'n reeds-bestaande geleentheid
export async function getPrediction(eventId: string): Promise<PredictionResult> {
    return apiClient.get<PredictionResult>(`/analytics/prediction?eventId=${eventId}`);
}

export type ModelHealth = 'good' | 'fair' | 'poor' | 'unknown';

export interface ModelStatus {
    available: boolean;
    trainedAt: string | null;
    eventsUsed: number | null;
    fillRateMae: number | null;
    noShowMae: number | null;
    health: ModelHealth;
}

// GET /analytics/model-status -- ADMIN/DOSENT, wys of daar 'n opgeleide model bestaan
export async function getModelStatus(): Promise<ModelStatus> {
    return apiClient.get<ModelStatus>('/analytics/model-status');
}

export interface PredictionAccuracyItem {
    eventId: string;
    title: string;
    date: string;
    maxCapacity: number;
    predictedFillRate: number;
    actualFillRate: number;
    predictedAttendees: number;
    actualAttendees: number;
}

// GET /analytics/prediction-accuracy?eventIds=a,b,c -- ADMIN/DOSENT
export async function getPredictionAccuracy(eventIds: string[]): Promise<PredictionAccuracyItem[]> {
    if (eventIds.length === 0) return [];
    return apiClient.get<PredictionAccuracyItem[]>(`/analytics/prediction-accuracy?eventIds=${eventIds.map(encodeURIComponent).join(',')}`);
}