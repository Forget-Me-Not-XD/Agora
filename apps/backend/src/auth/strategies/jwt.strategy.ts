// ========== Imports: ==========
import { Injectable, UnauthorizedException } from '@nestjs/common';
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
  iat?: number;
  exp?: number;
  mustChangePassword?: boolean;
}

/**
 * Kyk of die payload 'n refresh token is.
 * Ou tokens het nog nie 'type' nie, maar net refresh tokens het 'n jti. Die jti-check
 * kan weg sodra die ou tokens verval het (7 dae na deploy).
 */
export function isRefreshToken(payload: JwtPayload): boolean {
  return payload.type === 'refresh' || (payload.type === undefined && Boolean(payload.jti));
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

    // Refresh tokens use the same secret, so block them here. Only /auth/refresh may use them.
    if (isRefreshToken(payload)) {
      throw new UnauthorizedException('Refresh token cannot be used as an access token');
    }

    const user = await this.usersService.findById(payload.sub).catch(() => null);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account no longer exists');
    }

    return {...payload, mustChangePassword: user.mustChangePassword };
  }
}
