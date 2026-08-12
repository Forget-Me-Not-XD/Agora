// ========== Imports: ==========
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Rsvp, RsvpSchema } from './schemas/rsvp.schema';
import { EventsModule } from '../events/events.module';
import { UsersModule } from '../users/users.module';
import { CalendarModule } from '../calendar/calendar.module';
import { RsvpService } from './rsvp.service';
import { RsvpController } from './rsvp.controller';

@Module ({
    imports: [
        MongooseModule.forFeature([{ name: Rsvp.name, schema: RsvpSchema }]),
        EventsModule,
        UsersModule,
        CalendarModule,
    ],
    providers: [RsvpService],
    controllers: [RsvpController],
    exports: [RsvpService],
})
export class RsvpModule {}
