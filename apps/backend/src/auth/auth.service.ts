// ========== Imports: ==========
import {
    Injectable,
    UnauthorizedException,
    ForbiddenException,
    NotFoundException,
    ServiceUnavailableException,
    Logger,
  } from '@nestjs/common';
  import { ConfigService } from '@nestjs/config';
  import ms, { type StringValue } from 'ms';
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
    private readonly PASSWORD_HISTORY_SIZE = 3;
  
    constructor(
      private readonly usersService: UsersService,
      private readonly jwtService: JwtService,
      private readonly config: ConfigService,
      private readonly rabbitmq: RabbitMQService,
    ) {
      // Check the expiry settings once at startup. A typo in .env then stops the app with a
      // clear error instead of quietly giving every session the wrong lifetime.
      for (const key of ['jwt.accessExpiry', 'jwt.refreshExpiry', 'jwt.idleExpiry']) {
        this.parseExpiryToSeconds(this.config.get<string>(key) ?? '');
      }
    }
  
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
      return this.issueTokenPair(user, { remember: dto.rememberMe ?? true });
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

      const passwordExpired = this.isPasswordExpired(user.passwordChangedAt);
      if (passwordExpired && !user.mustChangePassword) {
        await this.usersService.markPasswordExpired(user._id.toString());
        user.mustChangePassword = true;
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
      return this.issueTokenPair(user, { remember: dto.rememberMe ?? true });
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

      await this.assertPasswordNotReused(dto.newPassword, user.passwordHash, user.passwordHistory);

      const salt = await bcrypt.genSalt(this.BCRYPT_ROUNDS);
      const newPasswordHash = await bcrypt.hash(dto.newPassword, salt);
      const updatedHistory = [user.passwordHash, ...user.passwordHistory].slice(0, this.PASSWORD_HISTORY_SIZE);

      await this.usersService.changePassword(userId, newPasswordHash, updatedHistory);

      this.logger.log(`-- Password changed: ${user.email}`);
    }
  
    /**
     * Exchange a valid refresh token for a fresh token pair.
     *
     * Every call also hands out a new refresh token, so callers should store both new tokens.
     * The old refresh token isn't revoked (there is no token store); it keeps working until
     * it expires.
     *
     * The account is checked again in case it has been deactivated or locked, or the password
     * has expired. A refresh can move the idle window of a session without remember-me
     * forward, but never past the limit counted from the original login (see issueTokenPair).
     */
    async refresh(refreshToken: string): Promise<TokenPairDto> {
      let payload: JwtPayload;

      try {
        payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken);
      } catch {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      // Only refresh tokens can be redeemed here, and every refresh token carries the original
      // login time and the remember-me choice. Check this before touching the database.
      if (
        payload.type !== 'refresh' ||
        !payload.sub ||
        typeof payload.authAt !== 'number' ||
        typeof payload.remember !== 'boolean'
      ) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      // Only "user not found" means the session is dead. Anything else (e.g. Mongo is down)
      // becomes a 503, so the clients keep the session and try again later.
      const user = await this.usersService.findById(payload.sub).catch((err) => {
        if (err instanceof NotFoundException) return null;
        this.logger.error(`-- Refresh failed, could not load user: ${err}`);
        throw new ServiceUnavailableException('Could not refresh session, try again shortly');
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Account no longer exists');
      }

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        throw new ForbiddenException(`Account locked. Try again after ${user.lockedUntil.toISOString()}`);
      }

      // The password can expire mid-session, so check it here as well, the same way login does.
      // The web picks the flag up from the returned user and sends them to /change-password.
      if (this.isPasswordExpired(user.passwordChangedAt) && !user.mustChangePassword) {
        await this.usersService.markPasswordExpired(user._id.toString());
        user.mustChangePassword = true;
      }

      this.logger.log(`-- Token refreshed: ${user.email}`);
      // Keep the original login time, so refreshing never extends the session past its limit
      return this.issueTokenPair(user, { authAt: payload.authAt, remember: payload.remember });
    }

    // ── Helpers ──────────────────────────────────────
  
    /**
     * Issue an access + refresh token pair.
     *
     * authAt is when the user originally logged in. Leave it out for a new login, registration
     * or SSO login, and pass it on a refresh. No session lasts longer than refreshExpiry
     * (7 days by default) after that moment, however often the tokens are refreshed in between.
     * The access token never outlives the refresh token.
     *
     * remember = true  → the refresh token lasts until the end of the session.
     * remember = false → the refresh token only lasts idleExpiry (15 min by default). The web's
     *                    heartbeat refreshes it while the user is active, so it keeps moving
     *                    forward. Once they stop, nothing refreshes it and it expires. The token's
     *                    own expiry enforces this, so it doesn't depend on the browser cookie.
     */
    private async issueTokenPair(
      user: UserDocument,
      { authAt, remember = true }: { authAt?: number; remember?: boolean } = {},
    ): Promise<TokenPairDto> {
      const payload: JwtPayload = {
        sub: user._id.toString(),
        email: user.email,
        role: user.role,
      };
  
      const accessExpiry = this.config.get<StringValue>('jwt.accessExpiry')!;
      const refreshExpiry = this.config.get<StringValue>('jwt.refreshExpiry')!;
      const idleExpiry = this.config.get<StringValue>('jwt.idleExpiry')!;
  
      const nowSeconds   = Math.floor(Date.now() / 1000);
      const sessionStart = authAt ?? nowSeconds;
      const sessionLeft  = sessionStart + this.parseExpiryToSeconds(refreshExpiry) - nowSeconds;
  
      // The session has reached its limit, so the user has to log in again
      if (sessionLeft <= 0) {
        throw new UnauthorizedException('Session expired. Please sign in again.');
      }
  
      const refreshLeft = remember
        ? sessionLeft
        : Math.min(this.parseExpiryToSeconds(idleExpiry), sessionLeft);
  
      const accessSeconds = Math.min(this.parseExpiryToSeconds(accessExpiry), refreshLeft);
  
      const accessToken = await this.jwtService.signAsync(
        { ...payload, type: 'access' },
        { expiresIn: accessSeconds },
      );
      const refreshToken = await this.jwtService.signAsync(
        { ...payload, type: 'refresh', jti: uuidv4(), authAt: sessionStart, remember },
        { expiresIn: refreshLeft },
      );
  
      return {
        accessToken,
        refreshToken,
        expiresIn: accessSeconds,
        refreshExpiresIn: refreshLeft,
        tokenType: 'Bearer',
        user: UserResponseDto.fromDocument(user),
      };
    }
  
    /**
     * Turn an expiry like "15m" or "7d" into seconds. This uses ms, the same parser jsonwebtoken
     * uses, so values like "1w" or "30 days" mean what they say. Anything invalid throws.
     */
    private parseExpiryToSeconds(expiry: string): number {
      const millis = expiry ? ms(expiry as StringValue) : undefined;

      // ms returns undefined for anything it can't read. It also reads a bare number such as
      // "900" as milliseconds, which is why anything under a second is rejected too.
      if (typeof millis !== 'number' || !(millis >= 1000)) {
        throw new Error(`Invalid JWT expiry "${expiry}", use a value like "15m" or "7d"`);
      }
      return Math.floor(millis / 1000);
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

    private async assertPasswordNotReused(canidate: string, currentHash: string, history: string[]): Promise <void> {
      const hashesToCheck = [currentHash, ...history];
      for (const hash of hashesToCheck) {
        const reused = await bcrypt.compare(canidate, hash);
        if (reused) {
          throw new ForbiddenException(`New password must be different from your current password and your last ${this.PASSWORD_HISTORY_SIZE} passwords.`);
        }
      }
    }
  }
