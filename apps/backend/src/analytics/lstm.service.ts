// ========== Imports: ==========
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from 'mongoose';
import { EventDocument } from "../events/schemas/event.schema";
import { EventsService } from "../events/events.service";
import { Rsvp, RsvpDocument }from '../rsvp/schemas/rsvp.schema';

// ============================================================
// This interface is the boundary between the NestJS world and the Python world
// ============================================================ 

export interface TrainingDataItem {
    eventId: string;
    title: string;
    // Tuple [ MaxCapacity, dayOfWeek, month, daysInAdvance ]
    features: [number, number, number, number];
    labels: {
        fillRate: number;    // confirmedAttendees / maxCapacity 
        noShowRate: number;    // 1 - (checkedIn / confirmedAttendees)
    };
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
            .countDocuments({ events: event._id, checkedIn: true })
            .exec();

        const noShowRate = event.confirmedAttendees > 0
            ? 1 - checkedInCount / event.confirmedAttendees
            : 0;

        // Feature: days in advance:
        // Previously used implementation can result in negative values for past events - causes Neural Network result unstability:
        const createdAt = event.createdAt ?? event.date;
        const daysInAdvance = Math.max(
            0, 
            Math.round((event.date.getTime() - createdAt.getTime()) / 86_400_000),
        );

        return {
            eventId: event._id.toString(),
            title: event.title,
            features: [
                event.maxCapacity,              //<-- Seats available
                event.date.getDay(),            //<-- 0 = Sunday, 1 = Monday, 2 = Tuesday, ...
                event.date.getMonth() + 1,      //<-- 1 = Jan, 2 = Feb, 3 = Mar, ...
                daysInAdvance,                  // Planning Lead Time
            ],
            labels: {
                fillRate,
                noShowRate,
            },
        };
    }
}