// ========== Imports: ==========
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsModule } from '../events/events.module';
import { Rsvp, RsvpSchema } from '../rsvp/schemas/rsvp.schema';
import { LstmService } from './lstm.service';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';


// Importing MongooseModule.forFeature here gives the LstmService direct access to the Rsvp model:

@Module ({
    imports: [
        EventsModule,
        MongooseModule.forFeature([{ name: Rsvp.name, schema: RsvpSchema}]),
    ],
    providers: [LstmService, AnalyticsService],
    controllers: [AnalyticsController],
    exports: [],
})
export class AnalyticsModule {}