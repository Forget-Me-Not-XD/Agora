// ========== Imports: ==========
import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enums';
import { ExportService } from './export.service';

export type ExportType = 'kpis' | 'events-summary' | 'rsvp-summary';

@Controller('export')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ExportController {
    constructor(private readonly exportService: ExportService) {}

    @Get(':type')
    async exportCsv(
        @Param('type') type: ExportType,
        @Res() res: Response,
    ): Promise<void> {
        let csv: string;
        let filename: string;
        const date = new Date().toISOString().slice(0, 10);

        switch (type) {
            case 'kpis':
                csv      = await this.exportService.buildKpisCsv();
                filename = `kpis-${date}.csv`;
                break;
            case 'events-summary':
                csv      = await this.exportService.buildEventsSummaryCsv();
                filename = `events-summary-${date}.csv`;
                break;
            case 'rsvp-summary':
                csv      = await this.exportService.buildRsvpSummaryCsv();
                filename = `rsvp-summary-${date}.csv`;
                break;
            default:
                res.status(400).json({ message: `Onbekende uitvoer-tipe: ${type}` });
                return;
        }

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    }
}