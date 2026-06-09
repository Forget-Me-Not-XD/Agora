// ========== Imports: ==========
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EventsService } from './events.service';
import { EventResponseDto } from './dto/event-response.dto';

@Controller('events')
@UseGuards(JwtAuthGuard)

export class EventsController {
    constructor(private readonly eventsService: EventsService) {}

    @Get()
    async finAll(
        @Query('from') from?: string,
        @Query('to') to?: string,
    ): Promise<EventResponseDto[]> {
        const events = await this.eventsService.findAll(from, to);
        return events.map(EventResponseDto.fromDocument);
    }

    @Get(':id')
    async findOne(
        @Param('id') id: string,
    ): Promise<EventResponseDto> {
        const event = await this.eventsService.findById(id);
        return EventResponseDto.fromDocument(event);
    }
}