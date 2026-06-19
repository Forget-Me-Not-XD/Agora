// ========== Imports: ==========
import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { LstmService } from './lstm.service';
import { AnalyticsController } from './analytics.controller';

@Module ({
    imports: [EventsModule],
    providers: [LstmService],
    controllers: [AnalyticsController],
    exports: [],
})
export class AnalyticsModule {}