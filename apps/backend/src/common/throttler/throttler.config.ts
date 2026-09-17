// ========== Imports: ==========
import { createHash } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { THROTTLE_LIMITS } from './throttle-limits';
import { createUserOrIpTracker } from './throttler-trackers';
import { isExtraThrottled } from './throttle.decorators';

/**
 * The throttler setup for the whole API. ThrottlerGuard runs globally (see AppModule), so every
 * route goes through these three throttlers:
 *
 *   default → the route's own limit, counted per route. Routes change it with @Throttle({ default }).
 *   overall → one high cap across all routes together, so a client can't get around the
 *             per-route limits by spreading its requests over many routes.
 *   extra   → a second limit that only runs on routes marked with @ThrottleExtra.
 *
 * All three count per signed-in user, or per IP when signed out, unless a route passes its own
 * getTracker.
 */
export function createThrottlerOptions(jwt: JwtService): ThrottlerModuleOptions {
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
    };
}
