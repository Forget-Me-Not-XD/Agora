// ========== Imports: ==========
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Role } from '../common/enums/role.enums';
import { RsvpService } from './rsvp.service';
import { CreateRsvpDto } from './dto/create-rsvp.dto';
import { RsvpDocument } from './schemas/rsvp.schema';

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
    ): Promise<RsvpDocument[]> {
        return this.rsvpService.findRsvpsByEvent(eventId);
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