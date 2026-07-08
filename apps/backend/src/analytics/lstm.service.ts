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

        const [capacity, dayOfWeek, month, daysInAdvance] = this.computeFeatures(event);

        try {
            return await this.runPredictScript(capacity, dayOfWeek, month, daysInAdvance);
        } catch (err) {
            throw new ServiceUnavailableException(
                `Attendance prediction is currently unavailable: ${(err as Error).message}`,
            );
        }
    }

    // Same as predictAttendance, but for an event that doesn't exist yet -
    // used by the "create event" form to preview a prediction before submitting.
    async predictDraft(dto: PredictDraftEventDto): Promise<PredictionResult> {
        const [capacity, dayOfWeek, month, daysInAdvance] = this.computeDraftFeatures(dto);

        try {
            return await this.runPredictScript(capacity, dayOfWeek, month, daysInAdvance);
        } catch (err) {
            throw new ServiceUnavailableException(
                `Attendance prediction is currently unavailable: ${(err as Error).message}`,
            );
        }
    }

    private runPredictScript(
        capacity: number,
        dayOfWeek: number,
        month: number,
        daysInAdvance: number,
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
        const args = [scriptPath, String(capacity), String(dayOfWeek), String(month), String(daysInAdvance)];

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
