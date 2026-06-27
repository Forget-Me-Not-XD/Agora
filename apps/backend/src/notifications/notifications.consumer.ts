// ========== Imports: ==========
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { QUEUES, UserRegisteredEvent, PhotographerAssignedEvent } from '../messaging/events.constants';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsConsumer implements OnModuleInit {
    private readonly logger = new Logger(NotificationsConsumer.name);

    constructor(
        private readonly rabbitmq: RabbitMQService,
        private readonly notificationsService: NotificationsService,
    ) {}

    async onModuleInit(): Promise<void> {
        await this.rabbitmq.subscribe<UserRegisteredEvent>(
            QUEUES.NOTIFICATION_EMAIL,
            async (event) => this.handleEmail(event),
        );

        await this.rabbitmq.subscribe<PhotographerAssignedEvent>(
            QUEUES.PHOTOGRAPHER_ASSIGNED,
            async (event) => this.handlePhotographerAssigned(event),
        );
    }

    private async handleEmail(event: UserRegisteredEvent): Promise<void> {
        this.logger.log(
            `-- [EMAIL] Sending welcome message to ${this.maskEmail(event.email)}\n` +
            `        Hi ${event.name}! Your Akademia account (${event.role}) is ready.`,
        );
    }

    private async handlePhotographerAssigned(event: PhotographerAssignedEvent): Promise<void> {
        await this.notificationsService.createFromPhotographerAssigned(event);
        this.logger.log(
            `-- [NOTIFY] Notification created for photographer ${event.photographerId} ` +
            `on event ${event.eventId}`,
        );
    }

    private maskEmail(email: string): string {
        const [local = '', domain = ''] = email.split('@');
        return `${local.slice(0, 2)}***@${domain}`;
    }
}
