// ========== Imports: ==========
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from './schemas/event.schema';

@Module ({
    imports: [
        MongooseModule.forFeature ([{ name: Event.name, schema: EventSchema }]),
    ],
    providers: [],
    controllers: [],
    exports: [],
})
export class EventsModule {}