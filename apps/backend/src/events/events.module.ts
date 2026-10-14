// ========== Imports: ==========
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Event, EventSchema } from './schemas/event.schema';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { UsersModule } from '../users/users.module';
import { PlacesModule } from '../places/places.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { CalendarModule } from '../calendar/calendar.module';
import { Rsvp, RsvpSchema } from '../rsvp/schemas/rsvp.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { Notification, NotificationSchema } from '../notifications/schemas/notification.schema';

@Module ({
    imports: [
        MongooseModule.forFeature ([{ name: Event.name, schema: EventSchema }]),
        // Om 'n geleentheid se RSVPs, betalings en kennisgewings saam met hom te skrap. Die modelle
        // direk, nie RsvpService nie: RsvpModule hang reeds van EventsModule af (sirkel).
        MongooseModule.forFeature([
            { name: Rsvp.name, schema: RsvpSchema },
            { name: Payment.name, schema: PaymentSchema },
            { name: Notification.name, schema: NotificationSchema },
        ]),
        UsersModule, PlacesModule, ReviewsModule, CalendarModule,
    ],
    providers: [EventsService],
    controllers: [EventsController],
    exports: [EventsService],
})
export class EventsModule {}