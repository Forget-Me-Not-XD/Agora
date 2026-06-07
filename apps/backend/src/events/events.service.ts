// ========== Imports: ==========
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, isValidObjectId, Model } from 'mongoose';
import { Event, EventDocument } from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';

@Injectable()
export class EventsService {
    constructor(
        @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
    ) {}

    async create(dto: CreateEventDto, creatorId: string): Promise<EventDocument> {
        const created = new this.eventModel({
            ...dto,
            date:      new Date(dto.date),
            createdBy: creatorId,
        });
        return created.save();
    }

    async findAll(from?: string, to?: string): Promise<EventDocument[]> {
        const filter: FilterQuery<EventDocument> = {};

        if (from || to) {
            filter.date = {};
            if (from) filter.date.$gte = new Date(from);
            if (to)   filter.date.$lte = new Date(to);
        }

        return this.eventModel.find(filter).sort({ date: 1 }).exec();
    }

    async findById(id: string): Promise<EventDocument> {
        if (!isValidObjectId(id)) {
            throw new NotFoundException(`Event ${id} not found`);
        }

        const event = await this.eventModel.findById(id).exec();
        if (!event) throw new NotFoundException(`Event ${id} not found`);
        return event;
    }
}
