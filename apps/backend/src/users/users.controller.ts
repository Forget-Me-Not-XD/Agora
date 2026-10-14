// ========== Imports: ==========
import { Controller, Get, Patch, Delete, Post, Param, Body, Query, UseGuards, ForbiddenException, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UserResponseDto } from './dto/user-response.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from '../common/enums/role.enums';
import { UserTag } from '../common/enums/user-tag.enum';

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

  // Soek gebruikers per rol, tag, en/of vrye teks (?search= vir die admin-UI, ?q= bly werk)
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.DOSENT)
  async search(
    @Query('role') role?: Role,
    @Query('q') q?: string,
    @Query('search') search?: string,
    @Query('ids') ids?: string,
    @Query('tag') tag?: UserTag,
  ) : Promise<UserResponseDto[]> {
    const idList = ids ? ids.split(',').filter(Boolean) : undefined;
    return this.usersService.search(role, search ?? q, idList, tag);
  }

    /**
      Update a users profile. Users may only update their own profile.
      ADMINS may update all. Only ADMINS may change role, studyCenter, isActive or tags.
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

        const adminOnlyFieldsUsed =
            updateUserDto.tags !== undefined ||
            updateUserDto.role !== undefined ||
            updateUserDto.studyCenter !== undefined ||
            updateUserDto.isActive !== undefined;

        if (adminOnlyFieldsUsed && jwtPayload.role !== Role.ADMIN) {
            throw new ForbiddenException('Slegs administrateurs mag rol, studiesentrum, status of tags wysig.');
        }

        return this.usersService.updateUser(id, updateUserDto);
    }

    // Verwyder 'n gebruiker permanent. 'n Admin mag homself nie so verwyder nie.
    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteUser(
        @Param('id') id: string,
        @CurrentUser() jwtPayload: { sub: string, email: string, role: Role },
    ): Promise<void> {
        if (jwtPayload.sub === id) {
            throw new ForbiddenException('Jy kan nie jouself verwyder nie.');
        }
        await this.usersService.deleteById(id);
    }

    // Herstel 'n gebruiker se wagwoord na 'n nuwe tydelike wagwoord. Daar is geen e-posdiens
    // nie, so die wagwoord kom eenmalig in die respons terug vir die admin om self oor te dra.
    @Post(':id/reset-password')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @HttpCode(HttpStatus.OK)
    async resetPassword(@Param('id') id: string): Promise<{ temporaryPassword: string }> {
        const temporaryPassword = await this.usersService.resetPassword(id);
        return { temporaryPassword };
    }
}