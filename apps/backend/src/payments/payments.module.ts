// ========== Imports: ==========
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { EventsModule } from '../events/events.module';
import { RsvpModule } from '../rsvp/rsvp.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
        EventsModule,
        RsvpModule,
    ],
    providers: [PaymentsService],
    controllers: [PaymentsController],
    exports: [PaymentsService],
})
export class PaymentsModule {}
