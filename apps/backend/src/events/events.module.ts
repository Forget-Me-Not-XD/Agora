// ========== Imports: ==========
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from './schemas/event.schema';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { UsersModule } from '../users/users.module';
import { PlacesModule } from '../places/places.module';
import { ReviewsModule } from '../reviews/reviews.module';

@Module ({
    imports: [
        MongooseModule.forFeature ([{ name: Event.name, schema: EventSchema }]),
        UsersModule, PlacesModule, ReviewsModule,
    ],
    providers: [EventsService],
    controllers: [EventsController],
    exports: [EventsService],
})
export class EventsModule {}