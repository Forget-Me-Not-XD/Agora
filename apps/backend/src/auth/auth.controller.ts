import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Post, Headers, Res, UseFilters, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
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
import { SsoProfile } from './interfaces/sso-profile.interface';
import { SsoProvider } from '../common/enums/sso-provider.enum';
import { SsoExceptionFilter } from './filters/sso-exception.filter';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { skipPasswordCheck } from '../common/decorators/skip-password-check.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

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
    @Headers('cf-connecting-ip') cfConnectingIp: string,
    @Headers('user-agent') userAgent: string,
  ): Promise<TokenPairDto> {
    return this.authService.login(dto, cfConnectingIp ?? ip, userAgent ?? 'unknown');
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @skipPasswordCheck()
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ ok: boolean }> {
    await this.authService.changePassword(user.sub, dto);
    return { ok: true};
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  @UseFilters(SsoExceptionFilter)
  googleLogin(): void {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @UseFilters(SsoExceptionFilter)
  async googleCallback(
    @CurrentUser() profile: SsoProfile,
    @Res() res: Response,
  ): Promise<void> {
    const tokens = await this.authService.loginWithSso(profile, SsoProvider.GOOGLE);
    this.redirectWithTokens(res, tokens);
  }

  @Get('microsoft')
  @UseGuards(AuthGuard('microsoft'))
  @UseFilters(SsoExceptionFilter)
  microsoftLogin(): void {}

  @Get('microsoft/callback')
  @UseGuards(AuthGuard('microsoft'))
  @UseFilters(SsoExceptionFilter)
  async microsoftCallback(
    @CurrentUser() profile: SsoProfile,
    @Res() res: Response,
  ): Promise<void> {
    const tokens = await this.authService.loginWithSso(profile, SsoProvider.MICROSOFT);
    this.redirectWithTokens(res, tokens);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  me(@CurrentUser() user: JwtPayload): { ok: boolean; sub: string; role: string } {
    return { ok: true, sub: user.sub, role: user.role };
  }

  private redirectWithTokens(res: Response, tokens: TokenPairDto): void {
    const frontendUrl = this.config.get<string>('frontendUrl');
    const params = new URLSearchParams({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
    res.redirect(`${frontendUrl}/api/auth/sso-callback?${params.toString()}`);
  }
}