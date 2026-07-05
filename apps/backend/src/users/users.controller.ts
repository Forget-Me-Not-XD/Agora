// ========== Imports: ==========
import { Controller, Get, Patch, Param, Body, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
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

  // Lys alle gebruikers
  @Get('all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }

  // Soek gebruikers per rol
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.DOSENT)
  async search(
    @Query('role') role: Role,
    @Query('q') q?: string,
    @Query('ids') ids?: string,
  ) : Promise<UserResponseDto[]> {
    const idList = ids ? ids.split(',').filter(Boolean) : undefined;
    return this.usersService.search(role, q, idList);
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
