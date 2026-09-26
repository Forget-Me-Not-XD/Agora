// ========== Imports: ==========
import { Injectable } from '@nestjs/common';
import type { AlternativePrediction } from './lstm.service';

export type RecommendationType = 'day' | 'capacity' | 'noShow' | 'budget';

export type RecommendationSeverity = 'high' | 'medium' | 'low';

export interface Recommendation {
    type:           RecommendationType;
    severity:       RecommendationSeverity;
    message:        string;
    expectedImpact: string;
}

export interface RecommendationInput {
    predictedFillRate:   number;
    estimatedRsvps:      number;
    predictedNoShowRate: number;
    estimatedAttendees:  number;
    estimatedBudgetZar:  number;
    alternative:         AlternativePrediction[];
}

const MAX_RECOMMENDATIONS = 4;
const DAY_MIN_GAIN_POINTS = 10;
const DAY_HIGH_GAIN_POINTS = 20;
const CAPACITY_HEADROOM_PERCENT = 110;
const OVERSIZED_FACTOR = 1.5;
const NO_SHOW_THRESHOLD = 0.25;
const NO_SHOW_HIGH_THRESHOLD = 0.4;
const OVERBOOK_SCALE = 50;

const SEVERITY_ORDER: Record<RecommendationSeverity, number> = {
    high:   0,
    medium: 1,
    low:    2,
};

const AFRIKAANS_DAYS = ['Sondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrydag', 'Saterdag'];
const AFRIKAANS_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

@Injectable()
export class RecommendationService {
    buildRecommendations(prediction: RecommendationInput, capacity: number, targetDate: Date): Recommendation[] {
        const candidates = [
            this.dayRecommendatrion(prediction, targetDate),
            this.capacityRecommendation(prediction, capacity),
            this.noShowRecommendation(prediction),
            this.budgetRecommendation(prediction),
        ];

        return candidates
            .filter((recommendation): recommendation is Recommendation => recommendation !== null)
            .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
            .slice(0, MAX_RECOMMENDATIONS);
    }

    private dayRecommendation(prediction: RecommendationInput, targetDate: Date): Recommendation | null {
        const dayAlternatives = prediction.alternative.filter(alternative => alternative.kind !== 'recommendedCapacity');
        if (dayAlternatives.length === 0) return null;

        const best = dayAlternatives.reduce((top, alternative) =>
            alternative.predictedFillRate > top.predictedFillRate ? alternative:top,
        );

        const currentPercent = this.toPercent(prediction.predictedFillRate);
        const bestPercent = this.toPercent(best.predictedFillRate);
        const gainPoints = bestPercent - currentPercent;
    }
}