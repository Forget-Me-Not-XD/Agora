// ========== Imports: ==========
import { Controller, Delete, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { UsersService } from '../users/users.service';
import { RsvpService } from '../rsvp/rsvp.service';

@Controller('users')
export class AccountController {
    constructor(
        private readonly usersService: UsersService,
        private readonly rsvpService: RsvpService,
    ) {}

    @Delete('me')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteMyAccount(@CurrentUser() user: JwtPayload): Promise<void> {
        await this.rsvpService.cancelAllForUser(user.sub);
        await this.usersService.deleteById(user.sub);
    }
}
