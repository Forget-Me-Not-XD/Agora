// ========== Imports: ==========
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { QUEUES, UserRegisteredEvent, PhotographerAssignedEvent, ReviewRequestedEvent } from '../messaging/events.constants';
import { UsersService } from '../users/users.service';
import { NotificationsService } from './notifications.service';
import { MailService } from './mail.service';
import { welcomeEmail } from './templates/welcome.template';
import { reviewRequestEmail } from './templates/review-request.template';

@Injectable()
export class NotificationsConsumer implements OnModuleInit {
    private readonly logger = new Logger(NotificationsConsumer.name);

    constructor(
        private readonly rabbitmq: RabbitMQService,
        private readonly notificationsService: NotificationsService,
        private readonly mailService: MailService,
        private readonly usersService: UsersService,
        private readonly config: ConfigService,
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

        await this.rabbitmq.subscribe<ReviewRequestedEvent>(
            QUEUES.REVIEW_REQUESTED,
            async (event) => this.handleReviewRequested(event),
        );
    }

    private async handleEmail(event: UserRegisteredEvent): Promise<void> {
        const sent = await this.mailService.send(event.email, welcomeEmail(event.name));
        if (sent) {
            this.logger.log(`-- [EPOS] Welkom-e-pos gestuur aan ${this.maskEmail(event.email)}`);
        }
    }

    private async handlePhotographerAssigned(event: PhotographerAssignedEvent): Promise<void> {
        await this.notificationsService.createFromPhotographerAssigned(event);
        this.logger.log(
            `-- [NOTIFY] Notification created for photographer ${event.photographerId} ` +
            `on event ${event.eventId}`,
        );
    }

    private async handleReviewRequested(event: ReviewRequestedEvent): Promise<void> {
        const user = await this.usersService.findById(event.userId).catch(() => null);
        if (!user) {
            this.logger.warn(`-- [EPOS] Gebruiker ${event.userId} kon nie gelaai word nie; resensie-e-pos oorgeslaan`);
            return;
        }

        const reviewUrl = `${this.config.get<string>('frontendUrl')}/reviews/${encodeURIComponent(event.eventId)}`;
        const sent = await this.mailService.send(user.email, reviewRequestEmail(user.name, event.eventTitle, reviewUrl));
        if (sent) {
            this.logger.log(`-- [EPOS] Resensieversoek gestuur aan ${this.maskEmail(user.email)} vir geleentheid ${event.eventId}`);
        }
    }

    private maskEmail(email: string): string {
        const [local = '', domain = ''] = email.split('@');
        return `${local.slice(0, 2)}***@${domain}`;
    }
}
