// ========== Imports: ==========
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import configuration from './configuration';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { MessagingModule } from '../messaging/messaging.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { EventsModule } from '../events/events.module';
import { RsvpModule } from '../rsvp/rsvp.module';

@Module({
    imports: [
    // â”€â”€ Global configuration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    ConfigModule.forRoot({
        isGlobal: true,
        load: [configuration],
    }),

    // â”€â”€ MongoDB connection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    MongooseModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
        uri: config.get<string>('mongoUri'),
        }),
    }),

    // â”€â”€ Domain modules â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    MessagingModule,    // RabbitMQ â€” must load before consumers
    UsersModule,
    AuthModule,
    NotificationsModule,
    AuditModule,
    EventsModule,
    RsvpModule,
    ],
})
export class AppModule {}