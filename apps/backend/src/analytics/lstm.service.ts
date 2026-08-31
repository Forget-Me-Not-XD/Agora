// ========== Imports: ==========
import { Injectable, BadRequestException, ServiceUnavailableException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from 'mongoose';
import { spawn } from 'child_process';
import * as path from 'path';
import { EventDocument } from "../events/schemas/event.schema";
import { EventsService } from "../events/events.service";
import { Rsvp, RsvpDocument }from '../rsvp/schemas/rsvp.schema';
import { Role } from '../common/enums/role.enums';
import { PredictDraftEventDto } from './dto/predict-draft-event.dto';

// ============================================================
// This interface is the boundary between the NestJS world and the Python world
// ============================================================

export interface TrainingDataItem {
    eventId: string;
    title: string;
    date: string;
    // Tuple [ MaxCapacity, dayOfWeek, month, daysInAdvance ]
    features: [number, number, number, number];
    labels: {
        fillRate: number;    // confirmedAttendees / maxCapacity
        noShowRate: number;    // 1 - (checkedIn / confirmedAttendees)
    };
}

// Mirrors the JSON object predict.py prints to stdout:
export interface PredictionResult {
    predictedFillRate:   number;
    estimatedRsvps:      number;
    predictedNoShowRate: number;
    estimatedAttendees:  number;
    estimatedBudgetZAR:  number;
    reasoning:           string[];
}

// Retrospective: the model's forward-looking guess for a now-completed event,
// laid alongside what actually happened.
export interface PredictionAccuracyItem {
    eventId:             string;
    title:               string;
    date:                string;
    maxCapacity:          number;
    predictedFillRate:   number;
    actualFillRate:      number;
    predictedAttendees:  number;
    actualAttendees:     number;
}

// Must match SEQUENCE_LENGTH in apps/ml/train.py and apps/ml/predict.py EXACTLY
// the saved model was compiled for this many timestamps and cannot accept any other shape.
const SEQUENCE_LENGTH = 10;

@Injectable()
export class LstmService {
    constructor(
        private readonly eventsService: EventsService,
        // Direct injection of the RSVP model so we can run aggregate queries:
        @InjectModel(Rsvp.name) private readonly rsvpModel: Model<RsvpDocument>,
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

    private computeFeatures(event: EventDocument): [number, number, number, number] {
        // Feature: days in advance:
        // Previously used implementation can result in negative values for past events - causes Neural Network result unstability:
        const createdAt = event.createdAt ?? event.date;
        const daysInAdvance = Math.max(
            0,
            Math.round((event.date.getTime() - createdAt.getTime()) / 86_400_000),
        );

        return [
            event.maxCapacity,              //<-- Seats available
            event.date.getDay(),            //<-- 0 = Sunday, 1 = Monday, 2 = Tuesday, ...
            event.date.getMonth() + 1,      //<-- 1 = Jan, 2 = Feb, 3 = Mar, ...
            daysInAdvance,                  // Planning Lead Time
        ];
    }

    private computeDraftFeatures(dto: PredictDraftEventDto): [number, number, number, number] {
        const eventDate = new Date(dto.date);
        const now = new Date();
        const daysInAdvance = Math.max(
            0,
            Math.round((eventDate.getTime() - now.getTime()) / 86_400_000),
        );

        return [
            dto.maxCapacity,
            eventDate.getDay(),
            eventDate.getMonth() + 1,
            daysInAdvance,
        ];
    }

    // Fetches the SEQUENCE_LENGTH - 1 most recent real events strictly before targetDate,
    // computes their features the same way training does, and appends the target event's
    // own features as the final timestep - giving predict.py a genuine temporal window
    // instead of one event repeated.
    private async buildFeatureSequence(
        targetFeatures: [number, number, number, number],
        targetDate: Date,
        excludeEventId?: string,
    ): Promise<[number, number, number, number][]> {
        const historyNeeded = SEQUENCE_LENGTH - 1;

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

        const mostRecent = strictlyPast.slice(-historyNeeded);
        let historyFeatures = mostRecent.map(e => this.computeFeatures(e));

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

        // The model only ever learns [capacity, dayOfWeek, month, daysInAdvance] —
        // it has no notion of what actually happened, so for a past event it just
        // repeats the same forward-looking guess it would have made before the
        // event ever ran. That reliably disagrees with the real confirmedAttendees
        // already on record, so we refuse rather than show a misleading number.
        if (this.isEventPast(event)) {
            throw new BadRequestException(
                'Voorspellings is nie beskikbaar vir geleenthede wat reeds plaasgevind het nie.',
            );
        }

        const targetFeatures = this.computeFeatures(event);
        const sequence = await this.buildFeatureSequence(targetFeatures, event.date, event._id.toString());

        try {
            return await this.runPredictScript(sequence);
        } catch (err) {
            throw new ServiceUnavailableException(
                `Attendance prediction is currently unavailable: ${(err as Error).message}`,
            );
        }
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

            const targetFeatures = this.computeFeatures(event);
            const sequence = await this.buildFeatureSequence(targetFeatures, event.date, event._id.toString());

            let prediction: PredictionResult;
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
        const targetFeatures = this.computeDraftFeatures(dto);
        const eventDate = new Date(dto.date);
        const sequence = await this.buildFeatureSequence(targetFeatures, eventDate);

        try {
            return await this.runPredictScript(sequence);
        } catch (err) {
            throw new ServiceUnavailableException(
                `Attendance prediction is currently unavailable: ${(err as Error).message}`,
            );
        }
    }

    private runPredictScript(
        sequence: [number, number, number, number][],
    ): Promise<PredictionResult> {
        // apps/ml is a sibling of apps/backend; dist/ mirrors src/ (see tsconfig rootDir/outDir),
        // so this relative depth holds for both ts-node dev and the compiled build.
        const mlDir = path.resolve(__dirname, '../../../ml');
        const scriptPath = path.join(mlDir, 'predict.py');
        // Always use the ml venv's own interpreter - the system 'python' on PATH
        // may point at an unrelated install with no TensorFlow/numpy installed.
        const pythonPath = process.platform === 'win32'
            ? path.join(mlDir, 'venv', 'Scripts', 'python.exe')
            : path.join(mlDir, 'venv', 'bin', 'python');
        // spawn() (no shell: true) passes argv entries directly to the OS - no shell
        // parsing occurs, so JSON containing spaces/brackets/quotes needs no escaping.
        const args = [scriptPath, JSON.stringify(sequence)];

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
                try {
                    resolve(JSON.parse(stdout) as PredictionResult);
                } catch {
                    reject(new Error('predict.py returned invalid JSON'));
                }
            });
        });
    }
}
