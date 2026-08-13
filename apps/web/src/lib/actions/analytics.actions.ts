'use server';

// ========== Imports: ==========
import { getAttendancePrediction, getDraftAttendancePrediction, getPredictionAccuracy, PredictionUnavailableError } from '@/lib/api/analytics';
import type { PredictionResult, PredictDraftPayload, PredictionAccuracyItem } from '@/lib/api/analytics';

export interface AttendancePredictionResult {
    prediction?:  PredictionResult;
    unavailable?: boolean;
    error?:       string;
}

export async function getAttendancePredictionAction(
    eventId: string,
): Promise<AttendancePredictionResult> {
    try {
        const prediction = await getAttendancePrediction(eventId);
        return { prediction };
    } catch (err) {
        if (err instanceof PredictionUnavailableError) {
            return { unavailable: true };
        }
        return { error: err instanceof Error ? err.message : 'Kon nie voorspelling laai nie.' };
    }
}

export async function getDraftAttendancePredictionAction(
    payload: PredictDraftPayload,
): Promise<AttendancePredictionResult> {
    try {
        const prediction = await getDraftAttendancePrediction(payload);
        return { prediction };
    } catch (err) {
        if (err instanceof PredictionUnavailableError) {
            return { unavailable: true };
        }
        return { error: err instanceof Error ? err.message : 'Kon nie voorspelling laai nie.' };
    }
}

export interface PredictionAccuracyResult {
    items?: PredictionAccuracyItem[];
    error?: string;
}

export async function getPredictionAccuracyAction(
    eventIds: string[],
): Promise<PredictionAccuracyResult> {
    try {
        const items = await getPredictionAccuracy(eventIds);
        return { items };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Kon nie akkuraatheid laai nie.' };
    }
}
