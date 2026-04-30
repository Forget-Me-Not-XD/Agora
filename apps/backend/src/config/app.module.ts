import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import configuration from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MessagingModule } from './messaging/messaging.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';

@Module({
    imports: [
    // ── Global configuration ────────────────────
    ConfigModule.forRoot({
        isGlobal: true,
        load: [configuration],
    }),

    // ── MongoDB connection ──────────────────────
    MongooseModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
        uri: config.get<string>('mongoUri'),
        }),
    }),

    // ── Domain modules ──────────────────────────
    MessagingModule,    // RabbitMQ — must load before consumers
    UsersModule,
    AuthModule,
    NotificationsModule,
    AuditModule,
    ],
})
export class AppModule {}