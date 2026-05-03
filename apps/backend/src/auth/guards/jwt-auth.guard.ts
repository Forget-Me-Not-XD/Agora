// ========== Imports: ==========
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard that activates the 'jwt' Passport strategy.
 * Apply with @UseGuards(JwtAuthGuard) on any protected route.
 */

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}