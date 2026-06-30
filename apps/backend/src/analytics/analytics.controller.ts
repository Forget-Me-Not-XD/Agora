// ========== Imports: ==========
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../common/enums/role.enums';
import { Roles } from '../common/decorators/roles.decorator';
import { LstmService, TrainingDataItem } from './lstm.service';
import { AnalyticsService, AttendancePrediction, EventsPerMonth, RsvpPerEvent } from './analytics.service';

interface EventsSummaryResponse {
    eventsPerMonth: EventsPerMonth[];
    top5Events: RsvpPerEvent[];
}

interface RsvpSummaryResponse {
    rsvpsPerEvent: RsvpPerEvent[];
    averageFillRate: number;
}

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
    constructor(
        private readonly lstmService: LstmService,
        private readonly analyticsService: AnalyticsService,
    ) {}

    @Get('training-data')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    async getTrainingData(
        @Query('eventId') eventId?: string,
    ): Promise<TrainingDataItem[]> {
        return this.lstmService.getTrainingData(eventId);
    }

    @Get('events-summary')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    async getEventsSummary(): Promise<EventsSummaryResponse> {
        const [eventsPerMonth, top5Events] = await Promise.all([
            this.analyticsService.getEventsPerMonth(),
            this.analyticsService.getTop5Events(),
        ]);
        return { eventsPerMonth, top5Events };
    }

    @Get('rsvp-summary')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    async getRsvpSummary(): Promise<RsvpSummaryResponse> {
        const [rsvpsPerEvent, averageFillRate] = await Promise.all([
            this.analyticsService.getRsvpsPerEvent(),
            this.analyticsService.getAverageFillRate(),
        ]);
        return { rsvpsPerEvent, averageFillRate };
    }

    @Get('predict/:eventId')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    async predictAttendance(
        @Param('eventId') eventId: string,
    ): Promise<AttendancePrediction> {
        return this.analyticsService.predictAttendance(eventId);
    }
}