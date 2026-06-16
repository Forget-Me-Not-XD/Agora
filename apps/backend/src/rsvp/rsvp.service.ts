// ========== Imports: ==========
import { ConflictException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from 'mongoose';
import { randomUUID } from "crypto";
import { Rsvp, RsvpDocument } from './schemas/rsvp.schema';
import { CreateRsvpDto } from "./dto/create-rsvp.dto";
import { EventsService } from "../events/events.service";

@Injectable()
export class RsvpService {
    constructor(
        @InjectModel(Rsvp.name) private readonly rsvpModel: Model<RsvpDocument>,
        private readonly eventsService: EventsService,
    ) {}

    async createRsvp(dto: CreateRsvpDto, userId: string): Promise<RsvpDocument> {
        const event = await this.eventsService.findById(dto.eventId);

        const existing = await this.rsvpModel
        .findOne({ event: dto.eventId, user: userId})
        .exec();
        if (existing) {
            throw new ConflictException('Jy het alreeds vir hierdie geleentheid ingeskryf');
        }

        if (event.confirmedAttendees >= event.maxCapacity) {
            throw new ConflictException('Hierdie geleentheid is vol bespreek');
        }

        const rsvp = new this.rsvpModel({
            event: dto.eventId,
            user: userId,
            qrPayload: randomUUID(),
        });
        const saved = await rsvp.save();

        event.confirmedAttendees += 1;
        await event.save();

        return saved;
    }

    async findMyRsvps(userId: string): Promise<RsvpDocument[]> {
        return this.rsvpModel
        .find({ user: userId })
        .populate('event')
        .exec();
    }
}
