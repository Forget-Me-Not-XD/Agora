// ========== Imports: ==========
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extract the authenticated user from the request object.
 * Populated by JwtStrategy after JwtAuthGuard validates the token.
 *
 *   @example
 *   @Get('me')
 *   getMe(@CurrentUser() user: { sub: string; email: string; role: Role }) {
 *     return user;
 *   }
 */
export const CurrentUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    },
);