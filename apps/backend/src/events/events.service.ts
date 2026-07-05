// ========== Imports: ==========
import { ForbiddenException, Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, isValidObjectId, Model, Types } from 'mongoose';
import { Event, EventDocument } from './schemas/event.schema';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { AssignPhotographerDto } from './dto/assign-photographer.dto';
import { Role } from '../common/enums/role.enums';
import { visibleAttendanceRoles } from '../common/rbac/event-visibility';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { EXCHANGES, ROUTING_KEYS, PhotographerAssignedEvent } from '../messaging/events.constants';
import { UsersService } from '../users/users.service';

@Injectable()
export class EventsService {
    constructor(
        @InjectModel(Event.name) private readonly eventModel: Model<EventDocument>,
        private readonly rabbitMQService: RabbitMQService,
        private readonly usersService: UsersService,
    ) {}

    async create(dto: CreateEventDto, creatorId: string): Promise<EventDocument> {
        const start = new Date(dto.date);
        const end   = dto.endDate ? new Date(dto.endDate) : undefined;
        this.assertEndAfterStart(start, end);

        const created = new this.eventModel({
            ...dto,
            date:      start,
            endDate:   end,
            createdBy: creatorId,
        });
        return created.save();
    }

    async findAll(
        viewerRole: Role,
        viewerId: string,
        from?: string,
        to?: string,
    ): Promise<EventDocument[]> {
        const filter: FilterQuery<EventDocument> = {};

        if (from || to) {
            filter.date = {};
            if (from) filter.date.$gte = new Date(from);
            if (to)   filter.date.$lte = new Date(to);
        }

        // Rol-gebaseerde sigbaarheid: 'n gebruiker sien geleenthede op sy vlak en laer.
        // ADMIN sien alles, PHOTOGRAPHER(vlak 2) sien ook waar hy toegewys is.
        if (viewerRole !== Role.ADMIN) {
            const allowed = visibleAttendanceRoles(viewerRole);
            if (viewerRole === Role.PHOTOGRAPHER) {
                filter.$or = [
                    { intendedAttendance: { $in: allowed } },
                    { photographers: new Types.ObjectId(viewerId) },
                ];
            } else {
                filter.intendedAttendance = { $in: allowed };
            }
        }

        return this.eventModel.find(filter).sort({ date: 1 }).exec();
    }

    async findById(id: string, viewerRole?: Role, viewerId?: string): Promise<EventDocument> {
        if (!isValidObjectId(id)) {
            throw new NotFoundException(`Event ${id} not found`);
        }

        const event = await this.eventModel.findById(id).exec();
        if (!event) throw new NotFoundException(`Event ${id} not found`);

        // dwing rol-sigbaarheid, geen lek van versteekte geleenthede nie. Gee 404
        if (viewerRole && !this.canView(event, viewerRole, viewerId)) {
            throw new NotFoundException(`Event ${id} not found`);
        }

        return event;
    }

    private canView(event: EventDocument, viewerRole: Role, viewerId?: string): boolean {
        if (viewerRole === Role.ADMIN) return true;
        if (visibleAttendanceRoles(viewerRole).includes(event.intendedAttendance)) return true;
        if (viewerRole === Role.PHOTOGRAPHER && viewerId) {
            return event.photographers.some((p) => p.toString() === viewerId);
        }
        return false;
    }

    async incrementConfirmedAttendees(id: string): Promise<EventDocument> {
        if (!isValidObjectId(id)) {
            throw new NotFoundException(`Event ${id} not found`);
        }

        // Atomiese voorwaardelike inkrement voorkom die TOCTOU-wedloop tussen die
        // kapasiteitstoets en die skrywe wanneer verskeie RSVP's gelyktydig inkom.
        const updated = await this.eventModel.findOneAndUpdate(
            { _id: id, $expr: { $lt: ['$confirmedAttendees', '$maxCapacity'] } },
            { $inc: { confirmedAttendees: 1 } },
            { new: true },
        ).exec();

        if (updated) return updated;

        const event = await this.eventModel.findById(id).exec();
        if (!event) throw new NotFoundException(`Event ${id} not found`);
        throw new ConflictException('Hierdie geleentheid is vol bespreek');
    }

    async updateEvent(
        id: string,
        dto: UpdateEventDto,
        requesterId: string,
        requesterRole: Role,
    ): Promise<EventDocument> {

        const event = await this.findById(id);

        this.assertOwnership(event, requesterId, requesterRole);

        if (dto.photographers) {
            await this.assertValidPhotographers(dto.photographers);
        }

        const { date, endDate, ...rest } = dto;
        Object.assign(event, rest);
        if (date)    event.date    = new Date(date);
        if (endDate) event.endDate = new Date(endDate);

        this.assertEndAfterStart(event.date, event.endDate);

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

    private async assertValidPhotographers(photographerIds: string[]): Promise<void> {
        const uniqueIds = Array.from(new Set(photographerIds));
        const found = await this.usersService.search(Role.PHOTOGRAPHER, undefined, uniqueIds);
        const foundIds = new Set(found.map((user) => user.id));

        const invalidIds = uniqueIds.filter((photographerId) => !foundIds.has(photographerId));
        if (invalidIds.length > 0) {
            throw new BadRequestException(
                `Ongeldige fotograaf-ID('s): ${invalidIds.join(', ')}`,
            );
        }
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

    private assertEndAfterStart(start: Date, end?: Date): void {
        if (end && end.getTime() <= start.getTime()) {
            throw new BadRequestException('Die eind-datum moet ná die begin-datum wees');
        }
    }
}
