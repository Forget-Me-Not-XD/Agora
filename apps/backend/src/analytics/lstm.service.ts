// ========== Imports: ==========
import { Injectable, BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from 'mongoose';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { EventDocument } from "../events/schemas/event.schema";
import { EventsService } from "../events/events.service";
import { Rsvp, RsvpDocument }from '../rsvp/schemas/rsvp.schema';
import { Role } from '../common/enums/role.enums';
import { PredictDraftEventDto } from './dto/predict-draft-event.dto';
import { RecommendationService, Recommendation } from './recommendation.service';

// ============================================================
// This interface is the boundary between the NestJS world and the Python world
// ============================================================

// Raw feature tuple: [maxCapacity, dayOfWeek, month, dayOfMonth, daysInAdvance]
type EventFeatures = [number, number, number, number, number];

export interface TrainingDataItem {
    eventId: string;
    title: string;
    date: string;
    // Tuple [ MaxCapacity, dayOfWeek, month, dayOfMonth, daysInAdvance ]
    features: EventFeatures;
    labels: {
        fillRate: number;    // confirmedAttendees / maxCapacity
        noShowRate: number;    // 1 - (checkedIn / confirmedAttendees)
    };
}

export type AlternativeKind = 'sameWeek' | 'laterWeek' | 'recommendedCapacity';

export interface AlternativePrediction {
    kind:                AlternativeKind;
    date:                string;
    capacity:            number;
    dayOfWeek:           number;
    month:               number;
    dayOfMonth:          number;
    daysInAdvance:       number;
    predictedFillRate:   number;
    predictedNoShowRate: number;
    estimatedRsvps:      number;
    estimatedAttendees:  number;
}

// Mirrors the JSON object predict.py prints to stdout:
export interface PredictionResult {
    predictedFillRate:   number;
    estimatedRsvps:      number;
    predictedNoShowRate: number;
    estimatedAttendees:  number;
    estimatedBudgetZAR:  number;
    reasoning:           string[];
    alternatives:        AlternativePrediction[];
    recommendations:     Recommendation[];
}

type ModelPrediction = Omit<PredictionResult, 'recommendations'>;

type ScriptAlternative = Omit<AlternativePrediction, 'kind' | 'date'>;

interface PredictScriptOutput extends Omit<PredictionResult, 'alternatives' | 'recommendations'> {
    alternatives?:        ScriptAlternative[];
    recommendedCapacity?: ScriptAlternative | null;
}

interface AlternativeCandidate {
    kind:     AlternativeKind;
    date:     Date;
    features: EventFeatures;
}

// Retrospective: the model's forward-looking guess for a now-completed event,
// laid alongside what actually happened.
export interface PredictionAccuracyItem {
    eventId:             string;
    title:               string;
    date:                string;
    maxCapacity:         number;
    predictedFillRate:   number;
    actualFillRate:      number;
    predictedAttendees:  number;
    actualAttendees:     number;
}

export type ModelHealth = 'good' | 'fair' | 'poor' | 'unknown';

// Read from apps/ml/model_meta.json, written by train.py after the last training run.
export interface ModelStatus {
    available:      boolean;
    trainedAt:      string | null;
    eventsUsed:     number | null;
    fillRateMae:    number | null;
    noShowMae:      number | null;
    health:         ModelHealth;
}

// Only the fields we actually read out of model_meta.json.
interface ModelMetaFile {
    trained_at: string;
    n_events:   number;
    fill_mae:   number;
    noshow_mae: number;

}

// Must match SEQUENCE_LENGTH in apps/ml/train.py and apps/ml/predict.py EXACTLY
// the saved model was compiled for this many timestamps and cannot accept any other shape.
const SEQUENCE_LENGTH = 10;

const DAYS_PER_WEEK = 7;
const WEEKS_AHEAD = 2;
const MAX_SUGGESTED_ALTERNATIVES = 5;

@Injectable()
export class LstmService {
    private readonly MODEL_HEALTH_GOOD_MAE = 0.10;
    private readonly MODEL_HEALTH_FAIR_MAE = 0.20;

    constructor(
        private readonly eventsService: EventsService,
        // Direct injection of the RSVP model so we can run aggregate queries:
        @InjectModel(Rsvp.name) private readonly rsvpModel: Model<RsvpDocument>,
        private readonly recommendationService: RecommendationService,
    ) {}

    // Returns training data for all past events, or for a single event by id:
    // While fetching all we filter to events that already happened:
    async getTrainingData(eventId ?: string): Promise <TrainingDataItem[]> {
        if (eventId !== undefined) {
            const event = await this.eventsService.findById(eventId);
            return [await this.toTrainingItem(event)];
        }

        // findAll supports an optional 'to' date filter - we use this to exclude future events
        const events = await this.eventsService.findAll(
            Role.ADMIN,
            '',
            undefined,
            new Date().toISOString(),
        );

        // Promise.all runs all the RSVP queries concurrently instead of serially
        return Promise.all(events.map(event => this.toTrainingItem(event)));
    }

    private async toTrainingItem(event: EventDocument): Promise <TrainingDataItem> {
        // Feature: fill rate (Label not input - or else an expected output begin sent as input will caude ML leakage)
        const fillRate = event.maxCapacity > 0
            ? event.confirmedAttendees / event.maxCapacity
            : 0

        // Label: no-show rate:
        const checkedInCount = await this.rsvpModel
            .countDocuments({ event: event._id, checkedIn: true })
            .exec();

        const noShowRate = event.confirmedAttendees > 0
            ? 1 - checkedInCount / event.confirmedAttendees
            : 0;

        return {
            eventId: event._id.toString(),
            title: event.title,
            date: event.date.toISOString(),
            features: this.computeFeatures(event),
            labels: {
                fillRate,
                noShowRate,
            },
        };
    }

    private computeFeatures(event: EventDocument): EventFeatures {
        return this.computeFeaturesAt(event.maxCapacity, event.date, event.createdAt ?? event.date);
    }

    private computeFeaturesAt(capacity: number, date: Date, plannedAt: Date): EventFeatures {
        // Feature: days in advance:
        // Previously used implementation can result in negative values for past events - causes Neural Network result unstability:
        const daysInAdvance = Math.max(
            0,
            Math.round((date.getTime() - plannedAt.getTime()) / 86_400_000),
        );

        return [
            capacity,                       //<-- Seats available
            date.getDay(),                  //<-- 0 = Sunday, 1 = Monday, 2 = Tuesday, ...
            date.getMonth() + 1,            //<-- 1 = Jan, 2 = Feb, 3 = Mar, ...
            date.getDate(),                 //<-- Day of the month, 1, ..., 31
            daysInAdvance,                  // Planning Lead Time
        ];
    }

    // Fetches the SEQUENCE_LENGTH - 1 most recent real events strictly before targetDate.
    private async findRecentHistory(
        targetDate: Date,
        excludeEventId?: string,
    ): Promise<EventDocument[]> {
        const candidates = await this.eventsService.findAll(
            Role.ADMIN,
            '',
            undefined,
            targetDate.toISOString(),
        );

        // findAll's `to` filter is inclusive and returns events sorted ascending by date -
        // keep only events strictly before the target, and defensively exclude the target's
        // own id in case of an exact date collision.
        const strictlyPast = candidates.filter(e =>
            e.date.getTime() < targetDate.getTime() &&
            (excludeEventId === undefined || e._id.toString() !== excludeEventId),
        );

        return strictlyPast.slice(-(SEQUENCE_LENGTH - 1));
    }

    // Computes the history's features the same way training does, and appends the target event's
    // own features as the final timestep - giving predict.py a genuine temporal window
    // instead of one event repeated.
    private buildFeatureSequence(
        targetFeatures: EventFeatures,
        history: EventDocument[],
    ): EventFeatures[] {
        const historyNeeded = SEQUENCE_LENGTH - 1;
        let historyFeatures = history.map(e => this.computeFeatures(e));

        if (historyFeatures.length < historyNeeded) {
            if (historyFeatures.length === 0) {
                // No real history at all yet - fall back to the old repeat-the-target
                // behaviour, since there's nothing else to pad with.
                historyFeatures = Array(historyNeeded).fill(targetFeatures);
            } else {
                const earliest = historyFeatures[0];
                const padding = Array(historyNeeded - historyFeatures.length).fill(earliest);
                historyFeatures = [...padding, ...historyFeatures];
            }
        }

        return [...historyFeatures, targetFeatures];
    }

    // Die 9-geleentheid-geskiedenis van die teikendatum word vir elke alternatief hergebruik.
    // Dit is 'n benadering wat net vir nabye datums geld: 'n alternatief tot 6 dae vroeër of
    // 20 dae later sien nie die geleenthede wat tussen die teikendatum en sy eie datum val nie.
    private buildAlternativeCandidates(
        capacity: number,
        targetDate: Date,
        plannedAt: Date,
    ): AlternativeCandidate[] {
        const candidates: AlternativeCandidate[] = [];
        const daysSinceMonday = (targetDate.getDay() + 6) % DAYS_PER_WEEK;
        const firstOffset = -daysSinceMonday;
        const lastOffset = DAYS_PER_WEEK * (WEEKS_AHEAD + 1) - 1 - daysSinceMonday;
        const firstOffsetOfNextWeek = DAYS_PER_WEEK - daysSinceMonday;

        for (let offset = firstOffset; offset <= lastOffset; offset++) {
            if (offset !== 0) {
                const kind: AlternativeKind = offset < firstOffsetOfNextWeek ? 'sameWeek' : 'laterWeek';
                candidates.push(this.toCandidate(kind, capacity, this.addDays(targetDate, offset), plannedAt));
            }
        }

        const now = Date.now();
        return candidates.filter(candidate => candidate.date.getTime() > now);
    }

    private toCandidate(
        kind: AlternativeKind,
        capacity: number,
        date: Date,
        plannedAt: Date,
    ): AlternativeCandidate {
        return {
            kind,
            date,
            features: this.computeFeaturesAt(capacity, date, plannedAt),
        };
    }

    private addDays(date: Date, days: number): Date {
        const result = new Date(date.getTime());
        result.setDate(result.getDate() + days);
        return result;
    }

    // 'n Geleentheid is "verby" sodra sy einde (of, as daar geen einde is nie, 3 uur
    // na sy begin) reeds verby is — dieselfde reël as web/mobile se eie status-afleiding.
    private isEventPast(event: EventDocument): boolean {
        const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
        const end = event.endDate ? event.endDate.getTime() : event.date.getTime() + THREE_HOURS_MS;
        return Date.now() > end;
    }

    // Loads the event, runs predict.py, and returns the model's live prediction.
    // Throws ServiceUnavailableException (-> HTTP 503) if the python process fails.
    async predictAttendance(eventId: string): Promise<PredictionResult> {
        const event = await this.eventsService.findById(eventId);

        // The model only ever learns [capacity, dayOfWeek, month, dayOfMonth, daysInAdvance] —
        // it has no notion of what actually happened, so for a past event it just
        // repeats the same forward-looking guess it would have made before the
        // event ever ran. That reliably disagrees with the real confirmedAttendees
        // already on record, so we refuse rather than show a misleading number.
        if (this.isEventPast(event)) {
            throw new BadRequestException(
                'Voorspellings is nie beskikbaar vir geleenthede wat reeds plaasgevind het nie.',
            );
        }

        const history = await this.findRecentHistory(event.date, event._id.toString());
        return this.predictWithAlternatives(
            event.maxCapacity,
            event.date,
            event.createdAt ?? event.date,
            history,
        );
    }

    // Retrospective accuracy check: re-runs the model's forward-looking guess for
    // events that have since happened, using the exact same features it would have
    // seen before the event (capacity/day/month are fixed, and daysInAdvance is
    // measured from event.createdAt, not from "now" — so there's no leakage of the
    // real outcome into the input). The result is compared against what actually
    // happened, which is exactly what "how accurate has the model been" needs —
    // unlike predictAttendance() above, which intentionally refuses past events
    // because it's meant as a live forward-looking tool, not a report card.
    async getPredictionAccuracy(eventIds: string[]): Promise<PredictionAccuracyItem[]> {
        const results = await Promise.all(eventIds.map(async (eventId) => {
            let event: EventDocument;
            try {
                event = await this.eventsService.findById(eventId);
            } catch {
                return null;
            }

            if (!this.isEventPast(event)) return null;

            const history = await this.findRecentHistory(event.date, event._id.toString());
            const sequence = this.buildFeatureSequence(this.computeFeatures(event), history);

            let prediction: PredictScriptOutput;
            try {
                prediction = await this.runPredictScript(sequence);
            } catch {
                return null;
            }

            const actualFillRate = event.maxCapacity > 0 ? event.confirmedAttendees / event.maxCapacity : 0;

            return {
                eventId: event._id.toString(),
                title: event.title,
                date: event.date.toISOString(),
                maxCapacity: event.maxCapacity,
                predictedFillRate: prediction.predictedFillRate,
                actualFillRate,
                predictedAttendees: prediction.estimatedAttendees,
                actualAttendees: event.confirmedAttendees,
            };
        }));

        return results.filter((item): item is PredictionAccuracyItem => item !== null);
    }

    // Same as predictAttendance, but for an event that doesn't exist yet -
    // used by the "create event" form to preview a prediction before submitting.
    async predictDraft(dto: PredictDraftEventDto): Promise<PredictionResult> {
        const eventDate = new Date(dto.date);
        const history = await this.findRecentHistory(eventDate);
        return this.predictWithAlternatives(dto.maxCapacity, eventDate, new Date(), history);
    }

    private async predictWithAlternatives(
        capacity: number,
        targetDate: Date,
        plannedAt: Date,
        history: EventDocument[],
    ): Promise<PredictionResult> {
        const targetFeatures = this.computeFeaturesAt(capacity, targetDate, plannedAt);
        const sequence = this.buildFeatureSequence(targetFeatures, history);
        const candidates = this.buildAlternativeCandidates(capacity, targetDate, plannedAt);

        let output: PredictScriptOutput;
        try {
            output = await this.runPredictScript(sequence, candidates);
        } catch (err) {
            throw new ServiceUnavailableException(
                `Attendance prediction is currently unavailable: ${(err as Error).message}`,
            );
        }

        const prediction = this.attachAlternatives(output, candidates, capacity, targetDate);
        const improvements = this.selectImprovements(prediction.alternatives, prediction.estimatedAttendees, targetDate);
        return {
            ...prediction,
            alternatives: improvements,
            // Die volle lys bly nodig vir die kapasiteitsreël: 'n kleiner lokaal is selde 'n "verbetering".
            recommendations: this.recommendationService.buildRecommendations(prediction, improvements, capacity, targetDate),
        };
    }

    private selectImprovements(
        alternatives: AlternativePrediction[],
        currentAttendees: number,
        targetDate: Date,
    ): AlternativePrediction[] {
        const distanceFromTarget = (alternative: AlternativePrediction) =>
            Math.abs(new Date(alternative.date).getTime() - targetDate.getTime());

        return alternatives
            .filter(alternative => alternative.estimatedAttendees > currentAttendees)
            .sort((a, b) => (b.estimatedAttendees - a.estimatedAttendees) || (distanceFromTarget(a) - distanceFromTarget(b)))
            .slice(0, MAX_SUGGESTED_ALTERNATIVES);
    }

    // apps/ml is a sibling of apps/backend; dist/ mirrors src' so this relative septh holds both ts-node dev and the compiled build
    private mlDir(): string {
        return path.resolve(__dirname, '../../../ml');
    }

    // Reads apps/ml/model_meta.json (written by train.py) to report wether a trained model is on disk and how accurate
    // it was on last held-out validation set
    async getModelStatus(): Promise <ModelStatus> {
        const modelPath = path.join(this.mlDir(), 'model.tflite');
        const metaPath = path.join(this.mlDir(), 'model_meta.json');

        if (!fs.existsSync(modelPath) || !fs.existsSync(metaPath)) {
            return this.unavailableModelStatus();
        }

        try {
            const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as ModelMetaFile;
            return {
                available: true,
                trainedAt: meta.trained_at,
                eventsUsed: meta.n_events,
                fillRateMae: meta.fill_mae,
                noShowMae: meta.noshow_mae,
                health: this.computeModelHealth(meta.fill_mae),
            };
        } catch {
            return this.unavailableModelStatus();
        }
    }

    private unavailableModelStatus(): ModelStatus {
        return {
            available: false,
            trainedAt: null,
            eventsUsed: null,
            fillRateMae: null,
            noShowMae: null,
            health: 'unknown',
        };
    }

    private computeModelHealth(fillRateMae: number): ModelHealth {
        if (fillRateMae <= this.MODEL_HEALTH_GOOD_MAE) return 'good';
        if (fillRateMae <= this.MODEL_HEALTH_FAIR_MAE) return 'fair';
        return 'poor';
    }

    private runPredictScript(
        sequence: EventFeatures[],
        candidates: AlternativeCandidate[] = [],
    ): Promise<PredictScriptOutput> {
        const scriptPath = path.join(this.mlDir(), 'predict.py');
        // Always use the venv's own interpreter - the system 'python' on PATH
        // may point to an invalid Python install
        const pythonPath = process.platform === 'win32'
            ? path.join(this.mlDir(), 'venv', 'Scripts', 'python.exe')
            : path.join(this.mlDir(), 'venv', 'bin', 'python');

        // spawn() (no shell: true) passes argv entries directly to the OS - no shell
        // parsing occurs, so JSON containing spaces/brackets/quotes needs no escaping.
        const args = [scriptPath, JSON.stringify(sequence)];
        if (candidates.length > 0) {
            args.push('--alternatives', JSON.stringify(candidates.map(candidate => candidate.features)));
        }

        return new Promise((resolve, reject) => {
            const child = spawn(pythonPath, args);

            let stdout = '';
            let stderr = '';
            child.stdout.on('data', (chunk) => { stdout += chunk; });
            child.stderr.on('data', (chunk) => { stderr += chunk; });

            child.on('error', reject);
            child.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(stderr.trim() || `predict.py exited with code ${code}`));
                    return;
                }

                let output: PredictScriptOutput;
                try {
                    output = JSON.parse(stdout) as PredictScriptOutput;
                } catch {
                    reject(new Error('predict.py returned invalid JSON'));
                    return;
                }

                resolve(output);
            });
        });
    }

    private attachAlternatives(
        output: PredictScriptOutput,
        candidates: AlternativeCandidate[],
        capacity: number,
        targetDate: Date,
    ): ModelPrediction {
        const { alternatives, recommendedCapacity, ...prediction } = output;
        const scriptAlternatives = Array.isArray(alternatives) ? alternatives : [];

        const dayAlternatives: AlternativePrediction[] = scriptAlternatives.length === candidates.length
            ? scriptAlternatives.map((alternative, index) => ({
                ...alternative,
                kind: candidates[index].kind,
                date: candidates[index].date.toISOString(),
            }))
            : [];

        const capacityAlternatives: AlternativePrediction[] =
            recommendedCapacity && recommendedCapacity.capacity !== capacity && targetDate.getTime() > Date.now()
                ? [{ ...recommendedCapacity, kind: 'recommendedCapacity', date: targetDate.toISOString() }]
                : [];

        return { ...prediction, alternatives: [...dayAlternatives, ...capacityAlternatives] };
    }
}
