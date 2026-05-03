// ========== Imports: ==========
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UserResponseDto } from './dto/user-response.dto';
import { Role } from '../common/enums/role.enum';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    /**
   * Returns the currently authenticated user's profile.
   * Used by the mobile dashboard on first load to refresh user info.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe (
    @CurrentUser() jwtPayload: { sub: string, email: string, role: Role },
  ): Promise <UserResponseDto> {
    const user = await this.usersService.findById(jwtPayload.sub);
    return UserResponseDto.fromDocument(user);
  }
}