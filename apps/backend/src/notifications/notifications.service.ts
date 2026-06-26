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

    
}