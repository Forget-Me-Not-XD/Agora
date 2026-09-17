// ========== Imports: ==========
import * as path from 'path';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';

import configuration from './configuration';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { MessagingModule } from '../messaging/messaging.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { EventsModule } from '../events/events.module';
import { PlacesModule } from '../places/places.module';
import { RsvpModule } from '../rsvp/rsvp.module';
import { PaymentsModule } from '../payments/payments.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { EventPlannerModule } from '../event-planner/event-planner.module';
import { PhotographersModule } from '../photographers/photographers.module';
import { ExportModule } from '../export/export.module';
import { CalendarModule } from '../calendar/calendar.module';
import { AccountModule } from '../account/account.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { HealthModule } from '../health/health.module';
import { createThrottlerOptions } from '../common/throttler/throttler.config';


@Module({
    imports: [
    // ========== Global configuration ==========
    ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: path.join(__dirname, '../../.env'),
        load: [configuration],
    }),

    // ========== MongoDB connection ==========
    MongooseModule.forRootAsync({
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
        uri: config.get<string>('mongoUri'),
        }),
    }),

    // ========== Throttler Module for Requests ==========
    // Setup and reasoning live in createThrottlerOptions, the limits in THROTTLE_LIMITS.
    // The JwtService is only used to read who a token belongs to, so it needs the secret and nothing else.
    ThrottlerModule.forRootAsync({
        inject: [ConfigService],
        useFactory: (config: ConfigService) =>
            createThrottlerOptions(new JwtService({ secret: config.get<string>('jwt.secret') })),
    }),

    // ========== Domain modules ==========
    HealthModule,
    MessagingModule,    // RabbitMQ must load before consumers
    UsersModule,
    AuthModule,
    NotificationsModule,
    AuditModule,
    EventsModule,
    PlacesModule,
    RsvpModule,
    PaymentsModule,
    AnalyticsModule,
    EventPlannerModule,
    PhotographersModule,
    ExportModule,
    CalendarModule,
    AccountModule,
    ],
    providers: [
        // Global, so every route is throttled, including ones added later. Use @SkipAllThrottles
        // for the few that must never be turned away.
        { provide: APP_GUARD, useClass: ThrottlerGuard },
    ],
})
export class AppModule {}
