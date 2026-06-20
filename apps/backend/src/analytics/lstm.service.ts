// ========== Imports: ==========
import { Injectable } from "@nestjs/common";
import { EventDocument } from "../events/schemas/event.schema";
import { EventsService } from "../events/events.service";

export interface TrainingDataItem {
    eventId: string;
    title: string;
    features: [number, number, number, number, number];
}

@Injectable()
export class LstmService {
    constructor(private readonly eventsService: EventsService) {}

    async getTrainingData(eventId ?: string): Promise <TrainingDataItem[]> {
        if (eventId !== undefined) {
            const event = await this.eventsService.findById(eventId);
            return [this.toTrainingItem(event)];
        }

        const events = await this.eventsService.findAll();
        return events.map((event) => this.toTrainingItem(event));
    }

    private toTrainingItem(event: EventDocument): TrainingDataItem {
        const fillRate = event.maxCapacity > 0
        ? event.confirmedAttendees / event.maxCapacity
        : 0;

        const daysUntilEvent = Math.round(
            (event.date.getTime() - Date.now()) / ( 1000 * 60 * 60 * 24),
        );

        return {
            eventId: event._id.toString(),
            title: event.title,
            features: [
                event.maxCapacity,
                event.date.getDay(),
                event.date.getMonth() + 1,
                fillRate,
                daysUntilEvent,
            ] as [number, number, number, number, number],
        };
    }
}