// ========== Imports: ==========
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

interface RequestWithIp {
    headers?: Record<string, string | string[] | undefined>;
    ip?: string;
}

/**
 * The IP of the user who made the request.
 *
 * req.ip is the address of whatever connected to us, which is a cloudflared pod or the web app's
 * Next server, so it's the same for every user.
 *
 * All outside traffic comes through Cloudflare, which sets cf-connecting-ip to the visitor's IP
 * and overwrites any value the client sent, so we can trust it. The web app passes the header
 * along when it calls login, register or refresh for a user (see apps/web/src/lib/client-ip.ts).
 *
 * Without Cloudflare there's no header, so we fall back to req.ip.
 */
export function getClientIp(req: RequestWithIp): string {
    const cfIp = req.headers?.['cf-connecting-ip'];
    if (typeof cfIp === 'string' && cfIp.trim()) {
        return cfIp.trim();
    }
    return req.ip ?? 'unknown';
}

/** Param decorator for getClientIp. */
export const ClientIp = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): string => {
        return getClientIp(ctx.switchToHttp().getRequest());
    },
);
