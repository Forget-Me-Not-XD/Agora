'use server';

// ========== Imports: ==========
import { getAttendancePrediction, getDraftAttendancePrediction, PredictionUnavailableError } from '@/lib/api/analytics';
import type { PredictionResult, PredictDraftPayload } from '@/lib/api/analytics';

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
