// ========== Imports: ==========
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventsService } from '../events/events.service';
import { EventDocument } from '../events/schemas/event.schema';
import { RsvpService } from '../rsvp/rsvp.service';
import { RabbitMQService } from '../messaging/rabbitmq.service';
import { EXCHANGES, ROUTING_KEYS, ReviewRequestedEvent } from '../messaging/events.constants';
import { REVIEW_REQUESTS } from '../common/constants/review-categories';
import { NotificationsService } from './notifications.service';

@Injectable()
export class ReviewRequestsScheduler {
    private readonly logger = new Logger(ReviewRequestsScheduler.name);

    constructor(
        private readonly eventsService: EventsService,
        private readonly rsvpService: RsvpService,
        private readonly notificationsService: NotificationsService,
        private readonly rabbitmq: RabbitMQService,
    ) {}

    @Cron(CronExpression.EVERY_HOUR)
    async sendReviewRequests(): Promise<void> {
        const now = new Date();
        const endedBefore = new Date(now.getTime() - REVIEW_REQUESTS.delayMs);
        const events = await this.eventsService.findDueForReviewRequests(endedBefore, REVIEW_REQUESTS.startDate);

        for (const event of events) {
            try {
                const claimed = await this.eventsService.claimReviewRequests(event._id.toString(), now);
                if (!claimed) continue;

                const sent = await this.sendForEvent(claimed);
                this.logger.log(`-- [RESENSIE] ${sent} versoek(e) gestuur vir geleentheid ${claimed._id}`);
            } catch (err) {
                this.logger.error(`Resensieversoeke vir geleentheid ${event._id} het misluk: ${(err as Error).message}`);
            }
        }
    }

    private async sendForEvent(event: EventDocument): Promise<number> {
        const rsvps = await this.rsvpService.findCheckedInAttendees(event._id.toString());
        let sent = 0;

        for (const rsvp of rsvps) {
            if (!rsvp.user) continue;

            try {
                await this.notificationsService.createReviewRequest(rsvp.user, event);

                const published = await this.rabbitmq.publish<ReviewRequestedEvent>(
                    EXCHANGES.EVENT,
                    ROUTING_KEYS.REVIEW_REQUESTED,
                    {
                        eventId: event._id.toString(),
                        userId: rsvp.user.toString(),
                        eventTitle: event.title,
                        timestamp: new Date().toISOString(),
                    },
                );
                if (!published) {
                    this.logger.warn(`Kon nie resensieversoek publiseer vir gebruiker ${rsvp.user} nie`);
                }

                sent++;
            } catch (err) {
                this.logger.error(`Resensieversoek vir gebruiker ${rsvp.user} het misluk: ${(err as Error).message}`);
            }
        }

        return sent;
    }
}
