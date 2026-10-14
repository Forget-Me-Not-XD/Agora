// ========== Imports: ==========
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsModule } from '../events/events.module';
import { Event, EventSchema } from '../events/schemas/event.schema';
import { Rsvp, RsvpSchema } from '../rsvp/schemas/rsvp.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { LstmService } from './lstm.service';
import { AnalyticsService } from './analytics.service';
import { RecommendationService } from './recommendation.service';
import { AnalyticsController } from './analytics.controller';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Review, ReviewSchema } from '../reviews/schemas/review.schema';
import { KeyFindingsService } from './key-findings.service';


// Importing MongooseModule.forFeature here gives the LstmService direct access to the Rsvp model:

@Module ({
    imports: [  
        EventsModule,
        MongooseModule.forFeature([
            { name: Event.name, schema: EventSchema },
            { name: User.name, schema: UserSchema },
            { name: Rsvp.name, schema: RsvpSchema},
            { name: Payment.name, schema: PaymentSchema },
            { name: Review.name, schema: ReviewSchema },
        ]),
    ],
    providers: [LstmService, AnalyticsService, RecommendationService, KeyFindingsService],
    controllers: [AnalyticsController],
    exports: [LstmService],
})
export class AnalyticsModule {}