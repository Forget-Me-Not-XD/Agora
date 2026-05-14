import {
    Injectable,
    UnauthorizedException,
    ForbiddenException,
    Logger,
  } from '@nestjs/common';
  import { ConfigService } from '@nestjs/config';
  import { JwtService } from '@nestjs/jwt';
  import * as bcrypt from 'bcrypt';
  import { v4 as uuidv4 } from 'uuid';
  
  import { UsersService } from '../users/users.service';
  import { UserDocument } from '../users/schemas/user.schema';
  import { UserResponseDto } from '../users/dto/user-response.dto';
  import { RegisterDto } from './dto/register.dto';
  import { LoginDto } from './dto/login.dto';
  import { TokenPairDto } from './dto/token-pair.dto';
  import { JwtPayload } from './strategies/jwt.strategy';
  import { RabbitMQService } from '../messaging/rabbitmq.service';
  import {
    EXCHANGES,
    ROUTING_KEYS,
    UserRegisteredEvent,
    UserLoginEvent,
    UserFailedLoginEvent,
  } from '../messaging/events.constants';
  
  @Injectable()
  export class AuthService {
    private readonly logger = new Logger(AuthService.name);
    private readonly BCRYPT_ROUNDS = 12;
  
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
  
      const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
      if (!passwordValid) {
        await this.usersService.incrementFailedAttempts(user._id.toString());
        await this.publishFailedLogin(dto.email, ip, 'wrong_password');
        throw new UnauthorizedException('Invalid credentials');
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
  
    // ── Helpers ──────────────────────────────────────
  
    private async issueTokenPair(user: UserDocument): Promise<TokenPairDto> {
      const payload: JwtPayload = {
        sub: user._id.toString(),
        email: user.email,
        role: user.role,
      };
  
      const accessExpiry = this.config.get<string>('jwt.accessExpiry')!;
      const refreshExpiry = this.config.get<string>('jwt.refreshExpiry')!;
  
      const accessToken = await this.jwtService.signAsync(payload, {
        expiresIn: accessExpiry,
      });
      const refreshToken = await this.jwtService.signAsync(
        { ...payload, jti: uuidv4() },
        { expiresIn: refreshExpiry },
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
  }