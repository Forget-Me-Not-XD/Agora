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

    // A refresh token is signed with the same secret, so it would otherwise
    // pass as a bearer token for its full lifetime. Only /auth/refresh may take it.
    if (payload.type === 'refresh') {
      throw new UnauthorizedException('Refresh token cannot be used as an access token');
    }

    const user = await this.usersService.findById(payload.sub).catch(() => null);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account no longer exists');
    }

    return {...payload, mustChangePassword: user.mustChangePassword };
  }
}
