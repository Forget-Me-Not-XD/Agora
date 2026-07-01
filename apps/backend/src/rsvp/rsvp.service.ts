// ========== Imports: ==========
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { toBuffer } from 'qrcode';
import { Rsvp, RsvpDocument, RsvpStatus } from './schemas/rsvp.schema';
import { CreateRsvpDto } from "./dto/create-rsvp.dto";
import { EventsService } from "../events/events.service";
import { Role } from '../common/enums/role.enums';
import { User } from '../users/schemas/user.schema';
import { Event } from '../events/schemas/event.schema';

export interface ScanResponse {
    guestName: string;
    eventTitle: string;
    eventDate: Date;
}

@Injectable()
export class RsvpService {
    constructor(
        @InjectModel(Rsvp.name) private readonly rsvpModel: Model<RsvpDocument>,
        private readonly eventsService: EventsService,
    ) {}

    async createRsvp(dto: CreateRsvpDto, userId: string): Promise<RsvpDocument> {
        await this.eventsService.findById(dto.eventId);

        const existing = await this.rsvpModel
        .findOne({ event: dto.eventId, user: userId })
        .exec();
        if (existing) {
            throw new ConflictException('Jy het alreeds vir hierdie geleentheid ingeskryf');
        }

        await this.eventsService.incrementConfirmedAttendees(dto.eventId);

        const rsvp = new this.rsvpModel ({
            event: dto.eventId,
            user: userId,
            qrPayload: uuidv4(),
        });

        return rsvp.save();
    }

    async findMyRsvps(userId: string): Promise<RsvpDocument[]> {
        return this.rsvpModel
        .find({ user: userId })
        .populate('event')
        .exec();
    }

    async findRsvpsByEvent(eventId: string): Promise<RsvpDocument[]>{
        await this.eventsService.findById(eventId);
        return this.rsvpModel
        .find({ event: eventId })
        .populate('user', '-passwordHash -__v')
        .exec();
    }

    async cancelRsvp(rsvpId: string, requesterId: string, requesterRole: Role): Promise<void> {
        if (!isValidObjectId(rsvpId)) {
            throw new NotFoundException(`RSVP ${rsvpId} nie gevind nie`);
        }

        const rsvp = await this.rsvpModel.findById(rsvpId).exec();
        if (!rsvp) throw new NotFoundException(`RSVP ${rsvpId} nie gevind nie`);

        if (requesterRole !== Role.ADMIN && rsvp.user.toString() !== requesterId) {
            throw new ForbiddenException('Jy mag slegs jou eie RSVP kanselleer');
        }

        rsvp.status = RsvpStatus.GEKANSELLEER;
        await rsvp.save();

        const event = await this.eventsService.findById(rsvp.event.toString());
        event.confirmedAttendees = Math.max(0, event.confirmedAttendees - 1);
        await event.save();
    }

    async getQrCode(rsvpId: string, requesterId: string, requesterRole: Role):Promise<Buffer>{
        if (!isValidObjectId(rsvpId)) {
            throw new NotFoundException(`RSVP ${rsvpId} nie gevind nie`);
        }

        const rsvp = await this.rsvpModel.findById(rsvpId).exec();
        if (!rsvp) throw new NotFoundException(`RSVP ${rsvpId} nie gevind nie`);

        if (requesterRole !== Role.ADMIN && rsvp.user.toString() !== requesterId) {
            throw new ForbiddenException(`Jy mag nie hierdie QR-kode opvra nie`);
        }
        

        return toBuffer(rsvp.qrPayload);
    }

    async scanRsvp(qrPayload: string): Promise <ScanResponse> {
        const rsvp = await this.rsvpModel
        .findOne({ qrPayload })
        .populate<{ user: User }>('user')
        .populate<{ event: Event }>('event')
        .exec();

        if (!rsvp) {
            throw new NotFoundException('Ongeldige QR-kode');
        }

        if (rsvp.checkedIn) {
            throw new ConflictException('Gas het reeds ingecheck');
        }

        rsvp.checkedIn = true;
        rsvp.checkedInAt = new Date();
        rsvp.status = RsvpStatus.BEVESTIG;
        await rsvp.save();

        return {
            guestName: `${rsvp.user.name} ${rsvp.user.surname}`,
            eventTitle: rsvp.event.title,
            eventDate: rsvp.event.date,
        };
    }
}
