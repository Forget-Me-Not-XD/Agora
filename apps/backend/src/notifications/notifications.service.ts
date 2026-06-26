// ========== Imports: ==========
import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { isValidObjectId, Model, Types } from "mongoose";
import { Notification, NotificationDocument } from './schemas/notification.schema';
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
        const dateStr = this.eventsService.updateEvent.toISOSring().split('T')[0];
        const message = `Vir ${event.title} op ${dateStr}: ${payload.brief}`;

        const notification = new this.notificationModel ({
            userId: new Types.ObjectId(payload.photographerId),
            event: new Types.ObjectId(payload.eventId),
            message,
        });

        return notification.save();
    }

    async findMyNotifications(suerId: string): Promise<NotificationDocument[]> {
        return this.notificationModel
        .find({ userId })
        .sort ({ createdAt: -1 })
        .populate( 'event' )
        .exec();
    }

    async markAsRead(notificationId: string, requesterId: string): Promise<NotificationDocument> {
        if (!isValidObjectId(notificationId)) {
            throw new NotFoundException(`Kennisgewing ${notificationId} nie gevinf nie`);
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