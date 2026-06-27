// ========== Imports: ==========
import { Controller, Get, HttpCode, HttpStatus, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { NotificationsService } from './notifications.service';
import { NotificationDocument } from './schemas/notification.schema';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) {}

    @Get('my')
    async findMyNotifications(
        @CurrentUser() user: JwtPayload,
    ): Promise<NotificationDocument[]> {
        return this.notificationsService.findMyNotifications(user.sub);
    }

    @Patch(':id/read')
    @HttpCode(HttpStatus.OK)
    async markAsRead(
        @Param('id') id: string,
        @CurrentUser() user: JwtPayload,
    ): Promise <NotificationDocument> {
        return this.notificationsService.markAsRead(id, user.sub);
    }
}