// ========== Imports: ==========
import { apiClient } from "./client";

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