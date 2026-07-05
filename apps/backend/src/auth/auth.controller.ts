import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Post, Headers, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TokenPairDto } from './dto/token-pair.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { RolesGuard } from './guards/roles.guard';
import { Role } from '../common/enums/role.enums';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtPayload } from './strategies/jwt.strategy';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(ThrottlerGuard)
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto): Promise<TokenPairDto> {
    return this.authService.register(dto);
  }

  @Post('admin/register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async adminRegister(
    @Body() dto: CreateUserDto,
  ): Promise <UserResponseDto> {
    return this.authService.adminCreateUser(dto)
  }

  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<TokenPairDto> {
    return this.authService.login(dto, ip, userAgent ?? 'unknown');
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  me(@CurrentUser() user: JwtPayload): { ok: boolean; sub: string; role: string } {
    return { ok: true, sub: user.sub, role: user.role };
  }
}