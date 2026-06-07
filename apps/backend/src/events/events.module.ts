// ========== Imports: ==========
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from './schemas/event.schema';
import { EventsService } from './events.service';

@Module ({
    imports: [
        MongooseModule.forFeature ([{ name: Event.name, schema: EventSchema }]),
    ],
    providers: [EventsService],
    controllers: [],
    exports: [EventsService],
})
export class EventsModule {}