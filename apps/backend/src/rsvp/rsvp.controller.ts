// ========== Imports: ==========
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Res, StreamableFile, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Role } from '../common/enums/role.enums';
import { RsvpService, ScanResponse } from './rsvp.service';
import { CreateRsvpDto } from './dto/create-rsvp.dto';
import { RsvpDocument } from './schemas/rsvp.schema';
import { ScanRsvpDto } from './dto/scan-rsvp.dto';
import { RsvpResponseDto } from './dto/rsvp-response.dto';
import { UserDocument } from '../users/schemas/user.schema';

@Controller('rsvp')
@UseGuards(JwtAuthGuard)
export class RsvpController {
    constructor(private readonly rsvpService: RsvpService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createRsvp(
        @Body() dto: CreateRsvpDto,
        @CurrentUser() user: JwtPayload,
    ): Promise <RsvpDocument> {
        return this.rsvpService.createRsvp(dto, user.sub);
    }

    @Post('scan')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN, Role.DOSENT)
    @HttpCode(HttpStatus.OK)
    async scanRsvp(
        @Body() dto: ScanRsvpDto,
    ): Promise <ScanResponse> {
        return this.rsvpService.scanRsvp(dto.qrPayload);
    }

    @Get('my')
    async findMyRsvps(
        @CurrentUser() user: JwtPayload,
    ): Promise <RsvpDocument[]> {
        return this.rsvpService.findMyRsvps(user.sub);
    }

    @Get('event/:eventId')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN, Role.DOSENT)
    async findRsvpsByEvent(
        @Param('eventId') eventId: string,
    ): Promise<RsvpResponseDto[]> {
        const rsvps = await this.rsvpService.findRsvpsByEvent(eventId);
        return rsvps.map(r => RsvpResponseDto.fromDocument(r as RsvpDocument & { user: UserDocument }));
    }

    @Get (':id/qr')
    async getQrCode(
        @Param('id') id: string,
        @CurrentUser() user: JwtPayload,
        @Res ({ passthrough: true }) res: Response,
    ): Promise <StreamableFile> {
        const buffer = await this.rsvpService.getQrCode(id, user.sub, user.role);
        res.set('Content-Type', 'image/png');
        return new StreamableFile(buffer);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    async cancelRsvp(
        @Param('id') id: string,
        @CurrentUser() user: JwtPayload,
    ): Promise<void> {
        return this.rsvpService.cancelRsvp(id, user.sub, user.role);
    }
}
