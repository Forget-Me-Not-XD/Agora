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
    estimatedBudgetZAR:  number;
    alternatives:        AlternativePrediction[];
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
const AFRIKAANS_MONTHS = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];

@Injectable()
export class RecommendationService {
    buildRecommendations(
        prediction: RecommendationInput,
        improvements: AlternativePrediction[],
        capacity: number,
        targetDate: Date,
    ): Recommendation[] {
        const candidates = [
            this.dayRecommendation(prediction, improvements, targetDate),
            this.capacityRecommendation(prediction, capacity),
            this.noShowRecommendation(prediction),
            this.budgetRecommendation(prediction),
        ];

        return candidates
            .filter((recommendation): recommendation is Recommendation => recommendation !== null)
            .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
            .slice(0, MAX_RECOMMENDATIONS);
    }

    // 'improvements' is reeds deur LstmService gesorteer (meeste bywoners eerste), so die eerste dag hier
    // is dieselfde dag as die UI se "Beste opsie" en die aanbeveling weerspreek dit nooit nie.
    private dayRecommendation(
        prediction: RecommendationInput,
        improvements: AlternativePrediction[],
        targetDate: Date,
    ): Recommendation | null {
        const best = improvements.find(alternative => alternative.kind !== 'recommendedCapacity');
        if (!best) return null;

        const currentPercent = this.toPercent(prediction.predictedFillRate);
        const bestPercent = this.toPercent(best.predictedFillRate);
        const gainPoints = bestPercent - currentPercent;
        if (gainPoints < DAY_MIN_GAIN_POINTS) return null;

        const bestDay = this.formatDay(best.dayOfWeek, best.dayOfMonth, best.month);
        const currentDay = this.formatDay(targetDate.getDay(), targetDate.getDate(), targetDate.getMonth() + 1);

        return {
            type: 'day',
            severity: gainPoints >= DAY_HIGH_GAIN_POINTS ? 'high' : 'medium',
            message: `Die model voorspel ${bestPercent}% op ${bestDay} teenoor ${currentPercent}% op ${currentDay}, so oorweeg dit om die geleentheid na ${bestDay} te skuif.`,
            expectedImpact: `+${gainPoints} persentasiepunte vulkoers`,
        };
    }

    private capacityRecommendation(prediction: RecommendationInput, capacity: number): Recommendation | null {
        if (prediction.estimatedRsvps <= 0) return null;

        const recommendedCapacity = Math.ceil(prediction.estimatedRsvps * CAPACITY_HEADROOM_PERCENT / 100);

        if (capacity > recommendedCapacity * OVERSIZED_FACTOR) {
            const modelOption = prediction.alternatives.find(alternative =>
                alternative.kind === 'recommendedCapacity' && alternative.capacity === recommendedCapacity,
            );
            const modelSentence = modelOption && this.toPercent(modelOption.predictedFillRate) > this.toPercent(prediction.predictedFillRate)
                ? ` Die model voorspel dan 'n vulkoers van ${this.toPercent(modelOption.predictedFillRate)}% in plaas van ${this.toPercent(prediction.predictedFillRate)}%.`
                : '';

            return {
                type: 'capacity',
                severity: 'medium',
                message: `Die model verwag net ongeveer ${prediction.estimatedRsvps} besprekings vir ${capacity} sitplekke, so kies 'n kleiner lokaal (±${recommendedCapacity} sitplekke).${modelSentence}`,
                expectedImpact: `${capacity - recommendedCapacity} minder leë sitplekke`,
            };
        }

        if (capacity < recommendedCapacity) {
            return {
                type: 'capacity',
                severity: 'high',
                message: `Die model verwag ongeveer ${prediction.estimatedRsvps} besprekings vir ${capacity} sitplekke, so verwag 'n waglys en oorweeg 'n groter lokaal (±${recommendedCapacity} sitplekke).`,
                expectedImpact: `±${recommendedCapacity - capacity} ekstra sitplekke nodig`,
            };
        }

        return null;
    }

    private noShowRecommendation(prediction: RecommendationInput): Recommendation | null {
        if (prediction.predictedNoShowRate <= NO_SHOW_THRESHOLD) return null;

        const noShowPercent = this.toPercent(prediction.predictedNoShowRate);
        const overbookPercent = Math.round(prediction.predictedNoShowRate * OVERBOOK_SCALE);

        return {
            type: 'noShow',
            severity: prediction.predictedNoShowRate > NO_SHOW_HIGH_THRESHOLD ? 'high' : 'medium',
            message: `Die model verwag dat ${noShowPercent}% van die mense wat bespreek nie sal opdaag nie, so stuur 'n herinnering 24 uur vooraf en laat ${overbookPercent}% meer besprekings toe as wat daar sitplekke is.`,
            expectedImpact: `${overbookPercent}% oorbespreking`,
        };
    }

    private budgetRecommendation(prediction: RecommendationInput): Recommendation | null {
        if (prediction.estimatedAttendees <= 0) return null;

        const costPerAttendee = Math.round(prediction.estimatedBudgetZAR / prediction.estimatedAttendees);

        return {
            type: 'budget',
            severity: 'low',
            message: `Die voorgestelde begroting van R ${this.formatRand(prediction.estimatedBudgetZAR)} kom neer op ≈ R ${this.formatRand(costPerAttendee)} per verwagte bywoner.`,
            expectedImpact: `≈ R ${this.formatRand(costPerAttendee)} per verwagte bywoner`,
        };
    }

    private toPercent(rate: number): number {
        return Math.round(rate * 100);
    }

    private formatDay(dayOfWeek: number, dayOfMonth: number, month: number): string {
        return `${AFRIKAANS_DAYS[dayOfWeek]} ${dayOfMonth} ${AFRIKAANS_MONTHS[month - 1]}`;
    }

    private formatRand(amount: number): string {
        return amount.toLocaleString('af-ZA');
    }
}
