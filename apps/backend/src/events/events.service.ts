// ========== Imports: ==========
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, isValidObjectId, Model, Types } from 'mongoose';
import { Event, EventDocument } from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { AssignPhotographerDto } from './dto/assign-photographer.dto';
import { Role } from '../common/enums/role.enums';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { EXCHANGES, ROUTING_KEYS, PhotographerAssignedEvent } from '../messaging/events.constants';

@Injectable()
export class EventsService {
    constructor(
        @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
        private readonly rabbitMQService: RabbitMQService,
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

    async updateEvent(
        id: string,
        dto: UpdateEventDto,
        requesterId: string,
        requesterRole: Role,
    ): Promise<EventDocument> {

        const event = await this.findById(id);

        this.assertOwnership(event, requesterId, requesterRole);

        const { date, ...rest } = dto;
        Object.assign(event, rest);
        if (date) event.date = new Date(date);

        return event.save();
    }

    async deleteEvent(
        id: string,
        requesterId: string,
        requesterRole: Role,
    ): Promise<void> {

        const event = await this.findById(id);

        this.assertOwnership(event, requesterId, requesterRole);

        await event.deleteOne();
    }

    async assignPhotographer(
        id: string,
        dto: AssignPhotographerDto,
    ): Promise<EventDocument> {
        const event = await this.findById(id);

        const alreadyAssigned = event.photographers.some(
            (p) => p.toString() === dto.photographerId,
        );

        if (!alreadyAssigned) {
            event.photographers.push(new Types.ObjectId(dto.photographerId));
        }

        event.photographerInstructions = dto.brief;
        const saved = await event.save();

        await this.rabbitMQService.publish<PhotographerAssignedEvent>(
            EXCHANGES.EVENT,
            ROUTING_KEYS.PHOTOGRAPHER_ASSIGNED,
            {
                eventId:        saved._id.toString(),
                photographerId: dto.photographerId,
                brief:          dto.brief,
                timestamp:      new Date().toISOString(),
            },
        );

        return saved;
    }

    private assertOwnership(
        event: EventDocument,
        requesterId: string,
        requesterRole: Role,
    ): void {
        if (requesterRole === Role.ADMIN) return;

        if (event.createdBy.toString() !== requesterId) {
            throw new ForbiddenException(
                `You do not have permission to modify this event`,
            );
        }
    }
}
