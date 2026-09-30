// ========== Imports: ==========
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Review, ReviewSchema } from './schemas/review.schema';
import { Event, EventSchema } from '../events/schemas/event.schema';
import { Rsvp, RsvpSchema } from '../rsvp/schemas/rsvp.schema';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';

@Module ({
    imports: [
        MongooseModule.forFeature([
            { name: Review.name, schema: ReviewSchema },
            { name: Event.name, schema: EventSchema },
            { name: Rsvp.name, schema: RsvpSchema },
        ]),
    ],
    providers: [ReviewsService],
    controllers: [ReviewsController],
    exports: [ReviewsService],
})
export class ReviewsModule {}
