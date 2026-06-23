// ========== Imports: ==========
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from '../events/schemas/event.schema';
import { Rsvp, RsvpDocument } from '../rsvp/schemas/rsvp.schema';

export interface RsvpPerEvent {
    eventTitle: string;
    totalRsvps: number;
}

export interface EventsPerMonth {
    year: number;
    month: number;
    count: number;
}

@Injectable()
export class AnalyticsService {
    constructor(
        @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
        @InjectModel(Rsvp.name) private readonly rsvpModel: Model<RsvpDocument>,
    ) {}

    async getRsvpsPerEvent(): Promise<RsvpPerEvent[]> {
        return this.rsvpModel.aggregate<RsvpPerEvent>([
            {
                $group: {
                    _id: '$event',
                    totalRsvps: { $sum: 1 },
                },
            },
            {
                $lookup: {
                    from: 'events',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'eventDoc',
                },
            },
            { $unwind: '$eventDoc' },
            {
                $project: {
                    _id: 0,
                    eventTitle: '$eventDoc.title',
                    totalRsvps: 1,
                },
            },
            { $sort: { totalRsvps: -1 } },
        ]).exec();
    }

    async getEventsPerMonth(): Promise<EventsPerMonth[]> {
        return this.eventModel.aggregate<EventsPerMonth>([
            {
                $group: {
                    _id: {
                        year: { $year: '$date' },
                        month: { $month: '$date' },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
            {
                $project: {
                    _id: 0,
                    year: '$_id.year',
                    month: '$_id.month',
                    count: 1,
                },
            },
        ]).exec();
    }
}