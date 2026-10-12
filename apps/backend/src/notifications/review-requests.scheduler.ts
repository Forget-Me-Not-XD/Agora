// ========== Imports: ==========
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventsService } from '../events/events.service';
import { EventDocument } from '../events/schemas/event.schema';
import { RsvpService } from '../rsvp/rsvp.service';
import { ReviewsService } from '../reviews/reviews.service';
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
        private readonly reviewsService: ReviewsService,
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
        const [rsvps, reviewerIds] = await Promise.all([
            this.rsvpService.findCheckedInAttendees(event._id.toString()),
            this.reviewsService.findReviewerIds(event._id),
        ]);

        // Die venster gaan oop sodra die geleentheid eindig, maar die versoeke gaan eers 'n uur of
        // wat later uit. Wie intussen reeds 'n resensie gegee het, kry nie meer 'n versoek of e-pos nie.
        const reviewed = new Set(reviewerIds.map((id) => id.toString()));
        let sent = 0;

        for (const rsvp of rsvps) {
            if (!rsvp.user || reviewed.has(rsvp.user.toString())) continue;

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

        if (sent > 0) await this.removeAnsweredRequests(event);
        return sent;
    }

    // Die lys van wie reeds beoordeel het, is net 'n momentopname van voor die lus. Gee iemand 'n
    // resensie terwyl die lus nog loop, verwyder ReviewsService.create dalk niks nie, want hul versoek
    // bestaan nog nie, en dan skep ons dit daarna steeds. Hierdie tweede kyk vang dit, want teen dié
    // tyd bestaan elke versoek uit die lus al. Die e-pos is dan wel klaar gestuur.
    private async removeAnsweredRequests(event: EventDocument): Promise<void> {
        try {
            const reviewerIds = await this.reviewsService.findReviewerIds(event._id);
            await this.notificationsService.removeReviewRequests(event._id, reviewerIds);
        } catch (err) {
            this.logger.error(`Kon nie beantwoorde resensieversoeke vir geleentheid ${event._id} opruim nie: ${(err as Error).message}`);
        }
    }
}
