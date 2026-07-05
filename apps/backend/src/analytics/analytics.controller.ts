// ========== Imports: ==========
import { Body, Controller, Get, Param, Post, Query, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../common/enums/role.enums';
import { Roles } from '../common/decorators/roles.decorator';
import { LstmService, TrainingDataItem, PredictionResult } from './lstm.service';
import { AnalyticsService, AttendancePrediction, EventsPerMonth, RsvpPerEvent, AdminKpis, RecentRsvp, RsvpStatusCount, BudgetPerMonth } from './analytics.service';
import { PredictDraftEventDto } from './dto/predict-draft-event.dto';

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

    @Get('admin-kpis')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    async getAdminKpis(): Promise <AdminKpis> {
        return this.analyticsService.getAdminKpis();
    }

    @Get('rsvps-per-month')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    async getRsvpsPerMonth(): Promise <EventsPerMonth[]> {
        return this.analyticsService.getRsvpsPerMonth();
    }

    @Get('recent-rsvps')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    async getRecentRsvps(@Query('limit') limit?: string): Promise <RecentRsvp[]> {
        return this.analyticsService.getRecentRsvps(limit ? parseInt(limit, 10) : 10);
    }

    @Get('rsvp-status-breakdown')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    async getRsvpStatusBreakdown(): Promise<RsvpStatusCount[]> {
        return this.analyticsService.getRsvpStatusBreakdown();
    }

    @Get('budget-per-month')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    async getBudgetPerMonth(): Promise<BudgetPerMonth[]> {
        return this.analyticsService.getBudgetPerMonth();
    }

    @Get('export')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    async exportCsv(
        @Query('type') type: string,
        @Res() res: Response,
    ): Promise<void> {
        const date = new Date().toISOString().slice(0, 10);
        const csv = await this.analyticsService.exportToCsv(type);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="uitvoer-${type}-${date}.csv"`);
        res.send(csv);
    }

    @Get('predict/:eventId')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    async predictAttendance(
        @Param('eventId') eventId: string,
    ): Promise<AttendancePrediction> {
        return this.analyticsService.predictAttendance(eventId);
    }

    @Get('prediction')
    async getAttendancePrediction(
        @Query('eventId') eventId: string,
    ): Promise<PredictionResult> {
        return this.lstmService.predictAttendance(eventId);
    }

    @Post('predict-draft')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN, Role.DOSENT)
    async predictDraftAttendance(
        @Body() dto: PredictDraftEventDto,
    ): Promise<PredictionResult> {
        return this.lstmService.predictDraft(dto);
    }
}
