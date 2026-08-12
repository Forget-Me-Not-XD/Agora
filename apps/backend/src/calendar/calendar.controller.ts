// ========== Imports: ==========
import { BadRequestException, Controller, Delete, Get, Query, Res, UseFilters, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { UsersService } from '../users/users.service';
import { GoogleCalendarService } from './services/google-calendar.service';
import { MicrosoftCalendarService } from './services/microsoft-calendar.service';
import { CalendarStatusDto } from './dto/calendar-status.dto';
import { CalendarExceptionFilter } from './filters/calendar-exception.filter';

interface StatePayload {
    sub: string;
}

@Controller('calendar')
export class CalendarController {
    constructor(
        private readonly usersService: UsersService,
        private readonly googleCalendarService: GoogleCalendarService,
        private readonly microsoftCalendarService: MicrosoftCalendarService,
        private readonly jwtService: JwtService,
        private readonly config: ConfigService,
    ) {}

    @Get('status')
    @UseGuards(JwtAuthGuard)
    async status(@CurrentUser() authUser: JwtPayload): Promise<CalendarStatusDto> {
        const user = await this.usersService.findById(authUser.sub);
        return {
            google: user.googleCalendar?.connected ?? false,
            microsoft: user.outlookCalendar?.connected ?? false,
            googleAccountEmail: user.googleCalendar?.accountEmail ?? null,
            microsoftAccountEmail: user.outlookCalendar?.accountEmail ?? null,
        };
    }

    @Get('google/connect')
    @UseGuards(JwtAuthGuard)
    @UseFilters(CalendarExceptionFilter)
    connectGoogle(@CurrentUser() authUser: JwtPayload, @Res() res: Response): void {
        const state = this.jwtService.sign({ sub: authUser.sub });
        res.redirect(this.googleCalendarService.buildAuthUrl(state));
    }

    @Get('google/callback')
    @UseFilters(CalendarExceptionFilter)
    async googleCallback(
        @Query('code') code: string,
        @Query('state') state: string,
        @Res() res: Response,
    ): Promise<void> {
        const userId = this.verifyState(state);
        const tokens = await this.googleCalendarService.exchangeCode(code);

        await this.usersService.updateGoogleCalendarConnection(userId, {
            connected: true,
            accountEmail: tokens.accountEmail,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenExpiresAt: tokens.expiryDate,
        });

        res.redirect(`${this.config.get<string>('frontendUrl')}/profile?calendar=google_connected`);
    }

    @Delete('google')
    @UseGuards(JwtAuthGuard)
    async disconnectGoogle(@CurrentUser() authUser: JwtPayload): Promise<{ ok: boolean }> {
        await this.usersService.clearGoogleCalendarConnection(authUser.sub);
        return { ok: true };
    }

    @Get('microsoft/connect')
    @UseGuards(JwtAuthGuard)
    @UseFilters(CalendarExceptionFilter)
    connectMicrosoft(@CurrentUser() authUser: JwtPayload, @Res() res: Response): void {
        const state = this.jwtService.sign({ sub: authUser.sub });
        res.redirect(this.microsoftCalendarService.buildAuthUrl(state));
    }

    @Get('microsoft/callback')
    @UseFilters(CalendarExceptionFilter)
    async microsoftCallback(
        @Query('code') code: string,
        @Query('state') state: string,
        @Res() res: Response,
    ): Promise<void> {
        const userId = this.verifyState(state);
        const tokens = await this.microsoftCalendarService.exchangeCode(code);

        await this.usersService.updateOutlookCalendarConnection(userId, {
            connected: true,
            accountEmail: tokens.accountEmail,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            tokenExpiresAt: tokens.expiryDate,
        });

        res.redirect(`${this.config.get<string>('frontendUrl')}/profile?calendar=microsoft_connected`);
    }

    @Delete('microsoft')
    @UseGuards(JwtAuthGuard)
    async disconnectMicrosoft(@CurrentUser() authUser: JwtPayload): Promise<{ ok: boolean }> {
        await this.usersService.clearOutlookCalendarConnection(authUser.sub);
        return { ok: true };
    }

    private verifyState(state: string): string {
        try {
            const payload = this.jwtService.verify<StatePayload>(state);
            return payload.sub;
        } catch {
            throw new BadRequestException('Invalid or expired calendar connection request');
        }
    }
}
