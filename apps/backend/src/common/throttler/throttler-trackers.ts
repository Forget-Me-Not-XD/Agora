// ========== Imports: ==========
import { createHash } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { getClientIp } from '../decorators/client-ip.decorator';

interface TrackableRequest {
    headers?: Record<string, string | string[] | undefined>;
    ip?: string;
    body?: Record<string, unknown>;
}

// Guards run before validation, so none of these can trust the body's shape. Anything that
// isn't what we expect falls back to the IP instead of throwing.

/** Per client IP. */
export function ipTracker(req: TrackableRequest): string {
    return `ip:${getClientIp(req)}`;
}

/**
 * Per signed-in user, or per IP when there's no usable token.
 *
 * The throttler runs as a global guard, which means it runs before JwtAuthGuard and req.user
 * doesn't exist yet. So we check the token's signature ourselves.
 *
 * Expired tokens still count as their user. The signature proves who they belong to, and the
 * moment a token expires is exactly when the web sends a burst of requests that need a clean
 * 401 so they can refresh. If those fell back to the IP they'd share a bucket and could get a
 * 429 instead. A made-up or tampered token fails the signature check and counts per IP.
 */
export function createUserOrIpTracker(jwt: JwtService): (req: TrackableRequest) => string {
    // Every request goes through several throttlers, so remember the answer instead of verifying
    // the same token three times
    const cache = new WeakMap<object, string>();

    return (req) => {
        const cached = cache.get(req);
        if (cached) return cached;

        const userId = verifiedUserId(jwt, req);
        const tracker = userId ? `user:${userId}` : ipTracker(req);
        cache.set(req, tracker);
        return tracker;
    };
}

function verifiedUserId(jwt: JwtService, req: TrackableRequest): string | null {
    const header = req.headers?.authorization;
    const token = typeof header === 'string' ? /^Bearer\s+(\S+)$/i.exec(header)?.[1] : undefined;
    if (!token) return null;

    try {
        const payload = jwt.verify<{ sub?: unknown }>(token, { ignoreExpiration: true });
        return typeof payload.sub === 'string' && payload.sub ? payload.sub : null;
    } catch {
        return null;
    }
}

/**
 * Per email address, for login. Trimmed and lowercased, so "Jan@X.com " and "jan@x.com" land in
 * the same bucket. The throttler hashes every key, so the address itself never ends up in storage.
 */
export function emailTracker(req: TrackableRequest): string {
    const email = req.body?.email;
    return typeof email === 'string' && email.trim()
        ? `email:${email.trim().toLowerCase()}`
        : ipTracker(req);
}

/**
 * Per refresh token, for /auth/refresh. The token is hashed so the raw value never ends up in
 * the throttler's storage. createHash throws on a non-string, which would turn a bad request into
 * a 500, hence the IP fallback.
 */
export function refreshTokenTracker(req: TrackableRequest): string {
    const token = req.body?.refreshToken;
    return typeof token === 'string' && token
        ? `rt:${createHash('sha256').update(token).digest('base64url')}`
        : ipTracker(req);
}
