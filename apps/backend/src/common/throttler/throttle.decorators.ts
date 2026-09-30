// ========== Imports: ==========
import { applyDecorators, ExecutionContext, SetMetadata } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

type ThrottleOptions = Parameters<typeof Throttle>[0][string];

const THROTTLE_EXTRA_KEY = 'throttle:extra';

/**
 * Adds a second, independent limit to a route, alongside its normal one.
 *
 * Login counts per email as well as per IP, and refresh counts per IP as well as per token.
 *
 * Named throttlers in @nestjs/throttler normally run on every route, so 'extra' stays switched
 * off until a route opts in here (see isExtraThrottled). Using @Throttle({ extra: ... }) on its
 * own won't work: it sets the limit but not the marker, so the route still skips it.
 */
export function ThrottleExtra(options: ThrottleOptions & Required<Pick<ThrottleOptions, 'limit' | 'ttl'>>) {
    return applyDecorators(
        SetMetadata(THROTTLE_EXTRA_KEY, true),
        Throttle({ extra: options }),
    );
}

export function isExtraThrottled(context: ExecutionContext): boolean {
    return Reflect.getMetadata(THROTTLE_EXTRA_KEY, context.getHandler()) === true
        || Reflect.getMetadata(THROTTLE_EXTRA_KEY, context.getClass()) === true;
}

/**
 * Leaves a route out of every throttler. Only for callers we must never turn away, like the
 * Kubernetes probes or PayFast confirming a payment.
 */
export function SkipAllThrottles() {
    return SkipThrottle({ default: true, overall: true, extra: true });
}
