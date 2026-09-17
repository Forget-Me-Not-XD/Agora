// ========== Imports: ==========
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

interface RequestWithIp {
    headers?: Record<string, string | string[] | undefined>;
    ip?: string;
}

/**
 * The IP address of the person behind the request.
 *
 * req.ip on its own is no use in production. It's the address of whatever connected to us, which
 * is either a cloudflared pod or the web app's Next server, so every user looks the same.
 *
 * All outside traffic comes in through Cloudflare, and Cloudflare puts the visitor's address in
 * cf-connecting-ip. It overwrites anything the client sent in that header, so it can't be faked
 * from outside. The web app passes the header on when it calls login, register and refresh on
 * a user's behalf (see apps/web/src/lib/client-ip.ts).
 *
 * Locally there's no Cloudflare, so we fall back to req.ip.
 */
export function getClientIp(req: RequestWithIp): string {
    const cfIp = req.headers?.['cf-connecting-ip'];
    if (typeof cfIp === 'string' && cfIp.trim()) {
        return cfIp.trim();
    }
    return req.ip ?? 'unknown';
}

/**
 * Param decorator for getClientIp.
 *
 *   @example
 *   @Post('login')
 *   login(@ClientIp() ip: string) { ... }
 */
export const ClientIp = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): string => {
        return getClientIp(ctx.switchToHttp().getRequest());
    },
);
