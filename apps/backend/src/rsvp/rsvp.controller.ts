// ========== Imports: ==========
import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
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
}