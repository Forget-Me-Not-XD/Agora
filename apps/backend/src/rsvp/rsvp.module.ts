// ========== Imports: ==========
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Rsvp, RsvpSchema } from './schemas/rsvp.schema';
import { EventsModule } from '../events/events.module';
import { RsvpService } from './rsvp.service';
import { RsvpController } from './rsvp.controller';

@Module ({
    imports: [
        MongooseModule.forFeature([{ name: Rsvp.name, schema: RsvpSchema }]),
        EventsModule,
    ],
    providers: [RsvpService],
    controllers: [RsvpController],
    exports: [],
})
export class RsvpModule {}
