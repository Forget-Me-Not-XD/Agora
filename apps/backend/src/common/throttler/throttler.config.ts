// ========== Imports: ==========
import { createHash } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { THROTTLE_LIMITS } from './throttle-limits';
import { createUserOrIpTracker } from './throttler-trackers';
import { isExtraThrottled } from './throttle.decorators';
import { ResilientThrottlerStorage } from './resilient-throttler-storage';

/**
 * The throttler setup for the whole API. ThrottlerGuard runs globally (see AppModule), so every
 * route goes through these three throttlers:
 *
 *   default → the route's own limit, counted per route. Change it with @Throttle({ default }).
 *   overall → one high cap across all routes together, so spreading requests over many routes
 *             doesn't get you past the per-route limits.
 *   extra   → a second limit, only on routes marked with @ThrottleExtra.
 *
 * All three count per signed-in user, or per IP when signed out, unless the route brings its own
 * getTracker.
 */
export function createThrottlerOptions(jwt: JwtService, redisUrl?: string): ThrottlerModuleOptions {
    return {
        throttlers: [
            { name: 'default', ...THROTTLE_LIMITS.baseline },
            {
                name: 'overall',
                ...THROTTLE_LIMITS.overall,
                // The default key includes the controller and handler, which would give every
                // route its own counter again. Leaving them out makes it one counter per user or IP.
                generateKey: (_context, tracker, name) =>
                    createHash('sha256').update(`${name}-${tracker}`).digest('hex'),
            },
            {
                name: 'extra',
                // Never used as is: @ThrottleExtra always brings its own limit and ttl
                ...THROTTLE_LIMITS.baseline,
                skipIf: (context) => !isExtraThrottled(context),
            },
        ],
        getTracker: createUserOrIpTracker(jwt),
        // Counts live in Redis so both pods share them, with counting per pod as the fallback.
        // Not the library's own storage, which lets counts get stuck (see InMemoryThrottlerStorage).
        storage: new ResilientThrottlerStorage(redisUrl),
        // The web shows this straight to the user (see loginAction), so it's in Afrikaans and
        // says how long the wait is instead of naming the exception.
        errorMessage: (_context, detail) => {
            const seconds = Math.max(1, detail.timeToBlockExpire);
            return `Te veel versoeke. Probeer weer oor ${seconds} sekonde${seconds === 1 ? '' : 's'}.`;
        },
    };
}
