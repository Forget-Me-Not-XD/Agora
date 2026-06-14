// ========== Imports: ==========
import { Controller, Get, Patch, Param, Body, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UserResponseDto } from './dto/user-response.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../common/enums/role.enums';

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

    /** 
      Update a users profile. Users may only update their own profile.
      ADMINS may update all.
    */
    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    async updateUser(
        @Param('id') id: string,
        @Body() updateUserDto: UpdateUserDto,
        @CurrentUser() jwtPayload: { sub: string, email: string, role: Role },
    ): Promise<UserResponseDto> {
      
        if (jwtPayload.sub !== id && jwtPayload.role !== Role.ADMIN) {
            throw new ForbiddenException('Jy mag slegs jou eie profiel wysig.');
        }

        return this.usersService.updateUser(id, updateUserDto);
    }
}
