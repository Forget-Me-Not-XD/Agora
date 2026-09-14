// ========== Imports: ==========
import { Injectable, NotFoundException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '../../common/enums/role.enums';
import { UsersService } from '../../users/users.service';

export type TokenType = 'access' | 'refresh';

export interface JwtPayload {
  sub: string;       // User _id
  email: string;
  role: Role;
  type?: TokenType;  // 'access' = API calls, 'refresh' = only redeemable at /auth/refresh
  jti?: string;      // Unique id, refresh tokens only
  authAt?: number;   // When the user logged in (epoch seconds), refresh tokens only
  remember?: boolean; // Remember-me session, refresh tokens only
  iat?: number;
  exp?: number;
  mustChangePassword?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.secret')!,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sub || !payload.email || !payload.role) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Refresh tokens use the same secret, so only let access tokens through here.
    // Refresh tokens can only be redeemed at /auth/refresh.
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Only an access token can be used here');
    }

    // Same as AuthService.refresh: only "user not found" is a 401. If Mongo is down we return
    // 503, otherwise the clients would think the session is dead and log the user out.
    const user = await this.usersService.findById(payload.sub).catch((err) => {
      if (err instanceof NotFoundException) return null;
      throw new ServiceUnavailableException('Could not verify session, try again shortly');
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account no longer exists');
    }

    return {...payload, mustChangePassword: user.mustChangePassword };
  }
}
