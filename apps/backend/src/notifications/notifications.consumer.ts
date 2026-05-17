import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { QUEUES, UserRegisteredEvent } from '../messaging/events.constants';

/**
 * Notification consumer.
 *
 * In production this would integrate with SendGrid / Twilio / FCM.
 * For Pre-Alpha we just log the action — the goal is to prove the
 * RabbitMQ pipeline works end-to-end.
 */
@Injectable()
export class NotificationsConsumer implements OnModuleInit {
    private readonly logger = new Logger(NotificationsConsumer.name);

    constructor(private readonly rabbitmq: RabbitMQService) {}

    async onModuleInit(): Promise<void> {
    await this.rabbitmq.subscribe<UserRegisteredEvent>(
        QUEUES.NOTIFICATION_EMAIL,
        async (event) => this.handleEmail(event),
        );
    }

    private async handleEmail(event: UserRegisteredEvent): Promise<void> {
    // Simulate work — replace with real SendGrid/SMTP call in production
    this.logger.log(
        `-- [EMAIL] Sending welcome message to ${this.maskEmail(event.email)}\n` +
        `        Hi ${event.name}! Your Akademia account (${event.role}) is ready.`,
    );

    // In production:
    //   await this.sendgrid.send({ to: event.email, template: 'welcome', ... });
    }

    private maskEmail(email: string): string {
        const [local = '', domain = ''] = email.split('@');
        return `${local.slice(0, 2)}***@${domain}`;
    }
}