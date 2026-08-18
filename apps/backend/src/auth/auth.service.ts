// ========== Imports: ==========
import {
    Injectable,
    UnauthorizedException,
    ForbiddenException,
    Logger,
  } from '@nestjs/common';
  import { ConfigService } from '@nestjs/config';
  import type { StringValue } from 'ms';
  import { JwtService } from '@nestjs/jwt';
  import * as bcrypt from 'bcrypt';
  import { v4 as uuidv4 } from 'uuid';
  
  import { UsersService } from '../users/users.service';
  import { UserDocument } from '../users/schemas/user.schema';
  import { UserResponseDto } from '../users/dto/user-response.dto';
  import { RegisterDto } from './dto/register.dto';
  import { CreateUserDto } from './dto/create-user.dto';
  import { LoginDto } from './dto/login.dto';
  import { TokenPairDto } from './dto/token-pair.dto';
  import { JwtPayload } from './strategies/jwt.strategy';
  import { SsoProfile } from './interfaces/sso-profile.interface';
  import { SsoProvider } from '../common/enums/sso-provider.enum';
  import { SsoAccountNotFoundException } from './exceptions/sso-account-not-found.exception';
  import { RabbitMQService } from '../messaging/rabbitmq.service';
  import { Role } from '../common/enums/role.enums';
  import {
    EXCHANGES,
    ROUTING_KEYS,
    UserRegisteredEvent,
    UserLoginEvent,
    UserFailedLoginEvent,
  } from '../messaging/events.constants';
  import { ChangePasswordDto } from './dto/change-password.dto';
  
  @Injectable()
  export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly BCRYPT_ROUNDS = 12;
    private readonly SELF_REGISTERABLE_ROLES = [Role.GAS, Role.STUDENT];
    private readonly PASSWORD_EXPIRY_DAYS = 90;
  
    constructor(
      private readonly usersService: UsersService,
      private readonly jwtService: JwtService,
      private readonly config: ConfigService,
      private readonly rabbitmq: RabbitMQService,
    ) {}
  
    /**
     * Register a new user.
     * Publishes auth.user.registered → triggers welcome email + audit log.
     */
    async register(dto: RegisterDto): Promise<TokenPairDto> {
      if (!this.SELF_REGISTERABLE_ROLES.includes(dto.role)) {
        throw new ForbiddenException('Self-registration is only permitted for the GAS or STUDENT role');
      }

      const salt = await bcrypt.genSalt(this.BCRYPT_ROUNDS)
      const passwordHash = await bcrypt.hash(dto.password, salt)
  
      const user = await this.usersService.create({
        name: dto.name,
        surname: dto.surname,
        email: dto.email.toLowerCase(),
        passwordHash,
        role: dto.role,
        studyCenter: dto.studyCenter ?? '',
      });
  
      // Async event — does not block the response
      const event: UserRegisteredEvent = {
        userId: user._id.toString(),
        email: user.email,
        name: `${user.name} ${user.surname}`,
        role: user.role,
        timestamp: new Date().toISOString(),
      };
      await this.rabbitmq.publish(EXCHANGES.AUTH, ROUTING_KEYS.USER_REGISTERED, event);
  
      this.logger.log(`-- User registered: ${user.email}`);
      return this.issueTokenPair(user);
    }
  
    /**
     * Create a user of any role. Admin-only — enforced by RolesGuard on the route.
     * Does not log the caller in as the new user; no tokens are issued.
     */
    async adminCreateUser(dto: CreateUserDto): Promise<UserResponseDto> {
      const salt = await bcrypt.genSalt(this.BCRYPT_ROUNDS)
      const passwordHash = await bcrypt.hash(dto.password, salt)
  
      const user = await this.usersService.create({
        name: dto.name,
        surname: dto.surname,
        email: dto.email.toLowerCase(),
        passwordHash,
        role: dto.role,
        studyCenter: dto.studyCenter ?? '',
        mustChangePassword: true,
      });
  
      const event: UserRegisteredEvent = {
        userId: user._id.toString(),
        email: user.email,
        name: `${user.name} ${user.surname}`,
        role: user.role,
        timestamp: new Date().toISOString(),
      };
      await this.rabbitmq.publish(EXCHANGES.AUTH, ROUTING_KEYS.USER_REGISTERED, event);
  
      this.logger.log(`-- User created by admin: ${user.email} (${user.role})`);
      return UserResponseDto.fromDocument(user);
    }
  
    /**
     * Authenticate a user with email + password.
     * Implements account lockout after 5 failed attempts.
     */
    async login(dto: LoginDto, ip: string, userAgent: string): Promise<TokenPairDto> {
      const user = await this.usersService.findByEmail(dto.email.toLowerCase());
  
      if (!user) {
        await this.publishFailedLogin(dto.email, ip, 'user_not_found');
        throw new UnauthorizedException('Invalid credentials');
      }
  
      if (!user.isActive) {
        await this.publishFailedLogin(dto.email, ip, 'account_inactive');
        throw new ForbiddenException('Account is deactivated');
      }
  
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        await this.publishFailedLogin(dto.email, ip, 'account_locked');
        throw new ForbiddenException(`Account locked. Try again after ${user.lockedUntil.toISOString()}`);
      }

      if (!user.passwordHash) {
        await this.publishFailedLogin(dto.email, ip, 'sso_only_account');
        throw new UnauthorizedException('This account uses SSO login. Sign in with Google or Microsoft instead.');
      }
  
      const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
      if (!passwordValid) {
        await this.usersService.incrementFailedAttempts(user._id.toString());
        await this.publishFailedLogin(dto.email, ip, 'wrong_password');
        throw new UnauthorizedException('Invalid credentials');
      }

      if (this.isPasswordExpired(user.passwordChangedAt)) {
        await this.publishFailedLogin(dto.email, ip, 'password_expired');
        throw new ForbiddenException('Password has expired. Please reset your password before logging in.');
      }
  
      // Successful login — clear lockout state
      await this.usersService.resetFailedAttempts(user._id.toString());
  
      const event: UserLoginEvent = {
        userId: user._id.toString(),
        email: user.email,
        ipAddress: ip,
        userAgent,
        timestamp: new Date().toISOString(),
      };
      await this.rabbitmq.publish(EXCHANGES.AUTH, ROUTING_KEYS.USER_LOGIN, event);
  
      this.logger.log(`-- User logged in: ${user.email}`);
      return this.issueTokenPair(user);
    }

    /**
     * Authenticate a user via Google/Microsoft SSO.
     * SSO never auto-creates an account — the email must already belong to an
     * existing user (self-registered or admin-created). If a password account
     * already exists with that email, it is linked to the SSO provider on
     * first use rather than duplicated.
     */
    async loginWithSso(profile: SsoProfile, provider: SsoProvider): Promise<TokenPairDto> {
      const user = await this.usersService.findByEmail(profile.email);

      if (!user) {
        throw new SsoAccountNotFoundException(profile.email);
      }

      if (!user.ssoProvider) {
        await this.usersService.linkSsoProvider(user._id.toString(), provider, profile.ssoId);
      }

      if (!user.isActive) {
        throw new ForbiddenException('Account is deactivated');
      }

      const event: UserLoginEvent = {
        userId: user._id.toString(),
        email: user.email,
        ipAddress: 'sso',
        userAgent: provider,
        timestamp: new Date().toISOString(),
      };
      await this.rabbitmq.publish(EXCHANGES.AUTH, ROUTING_KEYS.USER_LOGIN, event);

      this.logger.log(`-- SSO login: ${user.email} via ${provider}`);
      return this.issueTokenPair(user);
    }

    /**
     * Change the current user's password. Requires the current password
     * to be supplied, even though the caller already holds a valid JWT —
     * this defends against a stolen access token being used to lock the
     * real owner out by silently changing their password.
     */
    async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
      const user= await this.usersService.findById(userId);

      if (!user.passwordHash) {
        throw new ForbiddenException('This account uses SSO login and has no password to change.');
      }

      const currentValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!currentValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      const salt = await bcrypt.genSalt(this.BCRYPT_ROUNDS);
      const newPasswordHash = await bcrypt.hash(dto.newPassword, salt);

      await this.usersService.changePassword(userId, newPasswordHash);

      this.logger.log(`-- Password changed: ${user.email}`);
    }
  
    // ── Helpers ──────────────────────────────────────
  
    private async issueTokenPair(user: UserDocument): Promise<TokenPairDto> {
      const payload: JwtPayload = {
        sub: user._id.toString(),
        email: user.email,
        role: user.role,
      };
  
      const accessExpiry = this.config.get<StringValue>('jwt.accessExpiry')!;
      const refreshExpiry = this.config.get<StringValue>('jwt.refreshExpiry')!;
  
      const accessToken = await this.jwtService.signAsync(payload, {
        expiresIn: accessExpiry as StringValue,
      });
      const refreshToken = await this.jwtService.signAsync(
        { ...payload, jti: uuidv4() },
        { expiresIn: refreshExpiry as StringValue},
      );
  
      return {
        accessToken,
        refreshToken,
        expiresIn: this.parseExpiryToSeconds(accessExpiry),
        tokenType: 'Bearer',
        user: UserResponseDto.fromDocument(user),
      };
    }
  
    private parseExpiryToSeconds(expiry: string): number {
      const match = expiry.match(/^(\d+)([smhd])$/);
      if (!match) return 900;   // 15 min default
      const value = parseInt(match[1], 10);
      const unit = match[2];
      const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
      return value * (multipliers[unit] ?? 60);
    }
  
    private async publishFailedLogin(email: string, ip: string, reason: string): Promise<void> {
      const event: UserFailedLoginEvent = {
        email,
        ipAddress: ip,
        reason,
        timestamp: new Date().toISOString(),
      };
      await this.rabbitmq.publish(EXCHANGES.AUTH, ROUTING_KEYS.USER_FAILED_LOGIN, event);
    }

    private isPasswordExpired(passwordChangedAt: Date): boolean {
      const expiryMs = this.PASSWORD_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
      const ageMs = Date.now() - passwordChangedAt.getTime();
      return ageMs > expiryMs;
    }
  }
