// ========== Imports: ==========
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, Model, Types } from "mongoose";
import { Notification, NotificationDocument, NotificationType } from './schemas/notification.schema';
import { EventDocument } from "../events/schemas/event.schema";
import { EventsService } from "../events/events.service";
import { PhotographerAssignedEvent } from "../messaging/events.constants";

@Injectable()
export class NotificationsService {
    constructor(
        @InjectModel(Notification.name) private readonly notificationModel: Model<NotificationDocument>,
        private readonly eventsService: EventsService,
    ) {}

    async createFromPhotographerAssigned(payload: PhotographerAssignedEvent): Promise<NotificationDocument> {
        const event = await this.eventsService.findById(payload.eventId);
        const dateStr = event.date.toISOString().split('T')[0];
        const message = `Vir ${event.title} op ${dateStr}: ${payload.brief}`;

        const notification = new this.notificationModel ({
            userId: new Types.ObjectId(payload.photographerId),
            event: new Types.ObjectId(payload.eventId),
            message,
        });

        return notification.save();
    }

    async createReviewRequest(userId: Types.ObjectId, event: EventDocument): Promise <NotificationDocument> {
        const notification = new this.notificationModel({
            userId,
            event: event._id,
            type: NotificationType.RESENSIE_VERSOEK,
            message: `Hoe was ${event.title}? Los gerus 'n resensie.`,
        });

        return notification.save();
    }

    async findMyNotifications(userId: string): Promise<NotificationDocument[]> {
        return this.notificationModel
        .find({ userId })
        .sort ({ read: 1, createdAt: -1 })
        // Die kliënte gebruik net die event se _id en titel, so ons stuur nie die hele dokument elke poll nie
        .populate('event', 'title')
        .exec();
    }

    async markAsRead(notificationId: string, requesterId: string): Promise<NotificationDocument> {
        if (!isValidObjectId(notificationId)) {
            throw new NotFoundException(`Kennisgewing ${notificationId} nie gevind nie`);
        }

        const notification = await this.notificationModel.findById(notificationId).exec();
        if (!notification) {
            throw new NotFoundException(`Kennisgewing ${notificationId} nie gevind nie`)
        }

        if (notification.userId.toString() !== requesterId) {
            throw new ForbiddenException('Jy mag nie iemand anders se kennisgewing as gelees merk nie');
        }

        notification.read = true;
        return notification.save();
    }
}