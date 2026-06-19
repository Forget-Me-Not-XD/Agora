// ========== Imports: ==========
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../common/enums/role.enums';
import { Roles } from '../common/decorators/roles.decorator';
import { LstmService, TrainingDataItem } from './lstm.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
    constructor(private readonly lstmService: LstmService) {}

    @Get ('training-data')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    async getTrainingData(
        @Query('eventId') eventId ?: string,
    ): Promise <TrainingDataItem[]> {
        return this.lstmService.getTrainingData(eventId);
    }
}