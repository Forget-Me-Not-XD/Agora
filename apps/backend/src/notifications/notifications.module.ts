// ========== Imports: ==========
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { EventsModule } from '../events/events.module';
import { NotificationsConsumer } from './notifications.consumer';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
        EventsModule,
    ],
    providers: [NotificationsConsumer, NotificationsService],
    controllers: [NotificationsController],
    exports: [],
})
export class NotificationsModule {}
