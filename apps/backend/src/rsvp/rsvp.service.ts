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
            qrPayload: uuidv4(),
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

    async findRsvpsByEvent(eventId: string): Promise<RsvpDocument[]>{
        await this.eventsService.findById(eventId);
        return this.rsvpModel
        .find({ event: eventId })
        .populate('user')
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
}
