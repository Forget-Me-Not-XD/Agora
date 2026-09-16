// ========== Imports: ==========
import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { toBuffer } from 'qrcode';
import { Rsvp, RsvpDocument, RsvpStatus } from './schemas/rsvp.schema';
import { CreateRsvpDto } from "./dto/create-rsvp.dto";
import { CreateWalkInDto } from "./dto/create-walk-in.dto";
import { EventsService } from "../events/events.service";
import { UsersService } from "../users/users.service";
import { CalendarSyncService } from "../calendar/calendar-sync.service";
import { Role } from '../common/enums/role.enums';
import { User } from '../users/schemas/user.schema';
import { EventDocument } from "../events/schemas/event.schema";

export interface ScanResponse {
    guestName: string;
    eventTitle: string;
    eventDate: Date;
}

// geleenthede word vir so lank gesien deur die stelsel as aan die gang
// wanneer geen END DATE gegee was nie
const EVENT_GRACE_PERIOD_MS = 3 * 60 * 60 * 1000;

export class DuplicateTicketException extends ConflictException {
    constructor() {
        super("Jy het reeds 'n kaartjie vir hierdie geleentheid");
    }
}

@Injectable()
export class RsvpService {
    constructor(
        @InjectModel(Rsvp.name) private readonly rsvpModel: Model<RsvpDocument>,
        private readonly eventsService: EventsService,
        private readonly usersService: UsersService,
        private readonly calendarSyncService: CalendarSyncService,
    ) {}

    async createRsvp(dto: CreateRsvpDto, userId: string): Promise<RsvpDocument> {
        const event = await this.eventsService.findById(dto.eventId);

        if (event.sellsTickets) {
            throw new ForbiddenException('Hierdie geleentheid vereis \'n kaartjie-aankoop');
        }

        const hasPlusOne = Boolean(dto.plusOneName && dto.plusOneSurname && dto.plusOneEmail);
        if (hasPlusOne && !event.allowsPlusOne) {
            throw new ForbiddenException('Hierdie geleentheid laat nie \'n plus-een toe nie');
        }

        this.assertEventNotExpired(event);

        const existing = await this.rsvpModel
        .findOne({ event: dto.eventId, user: userId })
        .exec();
        if (existing && existing.status !== RsvpStatus.GEKANSELLEER) {
            throw new ConflictException('Jy het alreeds vir hierdie geleentheid ingeskryf');
        }

        await this.eventsService.incrementConfirmedAttendees(dto.eventId, hasPlusOne ? 2 : 1);

        // 'n Vorige gekanselleerde RSVP vir dieselfde (event, user) bestaan reeds as 'n
        // dokument -- die unieke indeks op (event, user) laat nie 'n tweede toe nie, so
        // ons herleef die bestaande dokument met 'n vars QR-kode eerder as om een te skep.
        const rsvp = existing ?? new this.rsvpModel({
            event: dto.eventId,
            user: userId,
            qrPayload: uuidv4(),
        });
        if (existing) {
            rsvp.status = RsvpStatus.HANGENDE;
            rsvp.qrPayload = uuidv4();
            rsvp.checkedIn = false;
            rsvp.checkedInAt = null;
            rsvp.googleCalendarEventId = null;
            rsvp.outlookCalendarEventId = null;
        }

        const stalePlusOneId = rsvp.plusOneRsvpId;

        if (hasPlusOne) {
            rsvp.plusOneName = dto.plusOneName;
            rsvp.plusOneSurname = dto.plusOneSurname;
            rsvp.plusOneEmail = dto.plusOneEmail;
        } else {
            rsvp.plusOneName = undefined;
            rsvp.plusOneSurname = undefined;
            rsvp.plusOneEmail = undefined;
        }

        let plusOneRsvp: RsvpDocument | null = null;
        if (hasPlusOne) {
            // Die +1-gas kry sy eie, volwaardige RSVP-dokument -- eie qrPayload en
            // checkedIn-status, presies asof hulle self ingeskryf het (soos 'n walk-in,
            // maar vooraf geskep i.p.v. eers by die deur).
            plusOneRsvp = new this.rsvpModel({
                event: dto.eventId,
                guestName: `${dto.plusOneName} ${dto.plusOneSurname}`,
                guestEmail: dto.plusOneEmail,
                qrPayload: uuidv4(),
                status: RsvpStatus.HANGENDE,
                primaryRsvpId: rsvp._id,
            });
            rsvp.plusOneRsvpId = plusOneRsvp._id;
        } else {
            rsvp.plusOneRsvpId = null;
        }

        try {
            if (plusOneRsvp) await plusOneRsvp.save();
            await rsvp.save();
        } catch (err) {
            // Niks van hierdie siklus het geldig gestoor nie -- gee die volle
            // gereserveerde plek terug en verwyder die weeskop +1-dokument (indien enige).
            await this.eventsService.decrementConfirmedAttendees(dto.eventId, hasPlusOne ? 2 : 1);
            if (plusOneRsvp) await this.rsvpModel.deleteOne({ _id: plusOneRsvp._id }).exec();
            throw err;
        }

        // 'n Vorige siklus se +1-gas-RSVP is nie meer geldig nie -- kanselleer dit eers
        // NADAT die nuwe toestand veilig gestoor is, sodat 'n mislukking hierbo nooit
        // die (nog geldige) ou +1 kanselleer sonder om 'n werkende nuwe een te skep nie.
        if (stalePlusOneId) {
            await this.cancelLinkedPlusOne(stalePlusOneId.toString());
        }

        const user = await this.usersService.findById(userId);
        const syncResult = await this.calendarSyncService.syncRsvpCreated(user, event);

        if (syncResult.googleCalendarEventId || syncResult.outlookCalendarEventId) {
            rsvp.googleCalendarEventId = syncResult.googleCalendarEventId;
            rsvp.outlookCalendarEventId = syncResult.outlookCalendarEventId;
            await rsvp.save();
        }

        return rsvp;
    }

    async hasTicket(eventId: string, userId: string): Promise<boolean> {
        const existing = await this.rsvpModel
        .findOne({ event: eventId, user: userId, status: { $ne: RsvpStatus.GEKANSELLEER } })
        .exec();
        return existing !== null;
    }

    async createPaidTicket(eventId: string, userId: string, paymentId: string): Promise<RsvpDocument> {
        
        const event = await this.eventsService.findById(eventId);
        this.assertEventNotExpired(event);

        const existing = await this.rsvpModel
        .findOne({ event: eventId, user: userId })
        .exec();
        if (existing && existing.status !== RsvpStatus.GEKANSELLEER) {
            throw new DuplicateTicketException();
        }

        await this.eventsService.incrementConfirmedAttendees(eventId);

        // 'n Vorige gekanselleerde RSVP vir dieselfde (event, user) bestaan reeds as 'n
        // dokument -- die unieke indeks op (event, user) laat nie 'n tweede toe nie, so
        // ons herleef die bestaande dokument met 'n vars QR-kode eerder as om een te skep.
        const rsvp = existing ?? new this.rsvpModel({ event: eventId, user: userId, qrPayload: uuidv4() });
        if (existing) {
            rsvp.qrPayload = uuidv4();
            rsvp.checkedIn = false;
            rsvp.checkedInAt = null;
            rsvp.googleCalendarEventId = null;
            rsvp.outlookCalendarEventId = null;
        }
        rsvp.status = RsvpStatus.BEVESTIG;
        rsvp.paid = true;
        rsvp.payment = new Types.ObjectId(paymentId);

        return rsvp.save();
    }

    async findMyRsvps(userId: string, dateFrom?: string, dateTo?: string): Promise<RsvpDocument[]> {
        const rsvps = await this.rsvpModel
            .find({ user: userId })
            .populate('event')
            .exec();

        if (!dateFrom && !dateTo) return rsvps;

        const from = dateFrom ? new Date(dateFrom) : null;
        const to   = dateTo   ? new Date(dateTo)   : null;
        if (to) to.setUTCHours(23, 59, 59, 999);

        return rsvps.filter((r) => {
            const event = r.event as unknown as { date?: Date } | null;
            if (!event?.date) return false;
            const eventDate = new Date(event.date);
            if (from && eventDate < from) return false;
            if (to && eventDate > to) return false;
            return true;
        });
    }

    async findRsvpsByEvent(eventId: string, requesterId: string, requesterRole: Role): Promise<RsvpDocument[]>{
        const event = await this.eventsService.findById(eventId);
        this.eventsService.assertOwnership(event, requesterId, requesterRole);

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

        // Idempotent: 'n dubbele-tik of herhaalde versoek op 'n reeds-gekanselleerde
        // RSVP moet nie kapasiteit 'n tweede keer aftrek nie.
        if (rsvp.status === RsvpStatus.GEKANSELLEER) {
            return;
        }

        const event = await this.eventsService.findById(rsvp.event.toString());

        // 'n Gebruiker mag altyd sy eie RSVP kanselleer; om iemand anders s'n te
        // kanselleer (of 'n walk-in sonder gekoppelde gebruiker) moet jy ADMIN wees,
        // of die DOSENT wat die geleentheid geskep het.
        const isOwnRsvp = rsvp.user?.toString() === requesterId;
        if (!isOwnRsvp) {
            this.eventsService.assertOwnership(event, requesterId, requesterRole);
        }

        const wasCheckedIn = rsvp.checkedIn;

        rsvp.status = RsvpStatus.GEKANSELLEER;
        await rsvp.save();

        await this.eventsService.decrementConfirmedAttendees(event._id.toString());

        // Ongewone geval: iemand wat reeds ingeteken is se RSVP word daarna
        // gekanselleer -- moenie hulle steeds as "bygewoon" tel nie.
        if (wasCheckedIn) {
            await this.eventsService.decrementCheckedInCount(event._id.toString());
        }

        // Die +1-gas se eie RSVP (indien enige) is nie meer geldig sodra die hoof-
        // registreerder kanselleer nie -- kanselleer dit ook, wat sy eie plek vrystel.
        if (rsvp.plusOneRsvpId) {
            await this.cancelLinkedPlusOne(rsvp.plusOneRsvpId.toString());
        }

        // Omgekeerde geval: as DIT die +1-gas se eie RSVP is wat hier gekanselleer
        // word (bv. 'n admin kanselleer net die gas se ry), moet die hoof-
        // registreerder se plusOneRsvpId nie na 'n dooie dokument bly wys nie.
        if (rsvp.primaryRsvpId) {
            await this.rsvpModel.updateOne(
                { _id: rsvp.primaryRsvpId },
                { $set: { plusOneRsvpId: null } },
            ).exec();
        }

        if (rsvp.user && (rsvp.googleCalendarEventId || rsvp.outlookCalendarEventId)) {
            const user = await this.usersService.findById(rsvp.user.toString());
            await this.calendarSyncService.syncRsvpCancelled(
                user,
                rsvp.googleCalendarEventId,
                rsvp.outlookCalendarEventId,
            );
        }
    }

    // Kanselleer 'n +1-gas se gekoppelde RSVP en stel sy plek vry. 'n No-op as dit
    // reeds gekanselleer is (bv. omdat dit vroeër al deur hierdie funksie hanteer is).
    private async cancelLinkedPlusOne(plusOneRsvpId: string): Promise<void> {
        const plusOneRsvp = await this.rsvpModel.findById(plusOneRsvpId).exec();
        if (!plusOneRsvp || plusOneRsvp.status === RsvpStatus.GEKANSELLEER) return;

        const wasCheckedIn = plusOneRsvp.checkedIn;
        plusOneRsvp.status = RsvpStatus.GEKANSELLEER;
        await plusOneRsvp.save();

        await this.eventsService.decrementConfirmedAttendees(plusOneRsvp.event.toString());

        if (wasCheckedIn) {
            await this.eventsService.decrementCheckedInCount(plusOneRsvp.event.toString());
        }
    }

    // Word gebruik wanneer die Event alreeds verloop het om te verseker dat daar nie geRSVP kan word nie.
    private assertEventNotExpired(event: EventDocument): void {
    const effectiveEnd = event.endDate ?? new Date(event.date.getTime() + EVENT_GRACE_PERIOD_MS);
    if (effectiveEnd.getTime() < Date.now()) {
        throw new ConflictException('Hierdie geleentheid het reeds afgehandel');
    }
}

    // Gebruik wanneer 'n gebruiker sy rekening verwyder: kanselleer al sy aktiewe RSVP's
    // sodat geleentheidkapasiteit en gekoppelde kalender-inskrywings korrek vrygestel word,
    // eerder as om weeskop-RSVP's met 'n verwysing na 'n nie-bestaande gebruiker agter te laat.
    async cancelAllForUser(userId: string): Promise<void> {
        const activeRsvps = await this.rsvpModel
            .find({ user: userId, status: { $ne: RsvpStatus.GEKANSELLEER } })
            .exec();

        for (const rsvp of activeRsvps) {
            await this.cancelRsvp(rsvp._id.toString(), userId, Role.GAS);
        }
    }

    async checkInRsvp(rsvpId: string, requesterId: string, requesterRole: Role): Promise<RsvpDocument> {
        if (!isValidObjectId(rsvpId)) {
            throw new NotFoundException(`RSVP ${rsvpId} nie gevind nie`);
        }

        const rsvp = await this.rsvpModel
        .findById(rsvpId)
        .populate('user', '-passwordHash -__v')
        .exec();
        if (!rsvp) throw new NotFoundException(`RSVP ${rsvpId} nie gevind nie`);

        const event = await this.eventsService.findById(rsvp.event.toString());
        this.eventsService.assertOwnership(event, requesterId, requesterRole);
        this.assertEventNotExpired(event);

        if (rsvp.status === RsvpStatus.GEKANSELLEER) {
            throw new ConflictException('Kan nie \'n gekanselleerde RSVP inteken nie');
        }
        if (rsvp.checkedIn) {
            throw new ConflictException('Gas het reeds ingecheck');
        }

        rsvp.checkedIn = true;
        rsvp.checkedInAt = new Date();
        rsvp.status = RsvpStatus.BEVESTIG;
        await rsvp.save();
        await this.eventsService.incrementCheckedInCount(event._id.toString());

        return rsvp;
    }

    async getQrCode(rsvpId: string, requesterId: string, requesterRole: Role):Promise<Buffer>{
        if (!isValidObjectId(rsvpId)) {
            throw new NotFoundException(`RSVP ${rsvpId} nie gevind nie`);
        }

        const rsvp = await this.rsvpModel.findById(rsvpId).exec();
        if (!rsvp) throw new NotFoundException(`RSVP ${rsvpId} nie gevind nie`);

        if (requesterRole !== Role.ADMIN && rsvp.user?.toString() !== requesterId) {
            // Nie die eienaar self nie -- maar as dit 'n +1-gas se RSVP is, mag die
            // persoon wat hulle uitgenooi het (die hoof-registreerder) dit steeds opvra.
            const primaryRsvp = rsvp.primaryRsvpId
                ? await this.rsvpModel.findById(rsvp.primaryRsvpId).exec()
                : null;
            if (primaryRsvp?.user?.toString() !== requesterId) {
                throw new ForbiddenException(`Jy mag nie hierdie QR-kode opvra nie`);
            }
        }

        if (rsvp.status === RsvpStatus.GEKANSELLEER) {
            throw new ConflictException('Hierdie RSVP is gekanselleer');
        }

        return toBuffer(rsvp.qrPayload);
    }

    async scanRsvp(qrPayload: string, requesterId: string, requesterRole: Role): Promise <ScanResponse> {
        const rsvp = await this.rsvpModel
        .findOne({ qrPayload })
        .populate<{ user: User }>('user')
        .exec();

        if (!rsvp) {
            throw new NotFoundException('Ongeldige QR-kode');
        }

        const event = await this.eventsService.findById(rsvp.event.toString());
        this.eventsService.assertOwnership(event, requesterId, requesterRole);
        this.assertEventNotExpired(event);

        if (rsvp.status === RsvpStatus.GEKANSELLEER) {
            throw new ConflictException('Kan nie \'n gekanselleerde RSVP inteken nie');
        }
        if (rsvp.checkedIn) {
            throw new ConflictException('Gas het reeds ingecheck');
        }

        rsvp.checkedIn = true;
        rsvp.checkedInAt = new Date();
        rsvp.status = RsvpStatus.BEVESTIG;
        await rsvp.save();
        await this.eventsService.incrementCheckedInCount(event._id.toString());

        // Walk-ins en +1-gaste het geen gekoppelde `user` nie -- val dan terug op
        // guestName (die naam wat by registrasie/RSVP-tyd ingesamel is).
        return {
            guestName: rsvp.user ? `${rsvp.user.name} ${rsvp.user.surname}` : rsvp.guestName ?? 'Onbekende gas',
            eventTitle: event.title,
            eventDate: event.date,
        };
    }

    // Iemand wat sonder 'n vooraf-RSVP opdaag: ons skep 'n RSVP sonder gekoppelde
    // gebruiker (net 'n naam) en teken hulle onmiddellik in, net soos 'n kaartjie
    // by die deur. Dit tel steeds teen die geleentheid se kapasiteit.
    async registerWalkIn(dto: CreateWalkInDto, requesterId: string, requesterRole: Role): Promise<RsvpDocument> {
        const event = await this.eventsService.findById(dto.eventId);
        this.eventsService.assertOwnership(event, requesterId, requesterRole);

        await this.eventsService.incrementConfirmedAttendees(dto.eventId);
        await this.eventsService.incrementCheckedInCount(dto.eventId);

        const rsvp = new this.rsvpModel({
            event: dto.eventId,
            guestName: dto.guestName.trim(),
            qrPayload: uuidv4(),
            status: RsvpStatus.BEVESTIG,
            checkedIn: true,
            checkedInAt: new Date(),
        });

        return rsvp.save();
    }
}
