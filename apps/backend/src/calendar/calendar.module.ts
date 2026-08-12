// ========== Imports: ==========
import { Module } from '@nestjs/common';
import type { StringValue } from 'ms';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CalendarController } from './calendar.controller';
import { CalendarSyncService } from './calendar-sync.service';
import { GoogleCalendarService } from './services/google-calendar.service';
import { MicrosoftCalendarService } from './services/microsoft-calendar.service';
import { CalendarExceptionFilter } from './filters/calendar-exception.filter';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [
        UsersModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get<string>('jwt.secret'),
                signOptions: { expiresIn: '10m' as StringValue },
            }),
        }),
    ],
    controllers: [CalendarController],
    providers: [CalendarSyncService, GoogleCalendarService, MicrosoftCalendarService, CalendarExceptionFilter],
    exports: [CalendarSyncService],
})
export class CalendarModule {}
