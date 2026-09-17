// ========== Imports: ==========
import { applyDecorators, ExecutionContext, SetMetadata } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

type ThrottleOptions = Parameters<typeof Throttle>[0][string];

const THROTTLE_EXTRA_KEY = 'throttle:extra';

/**
 * Adds a second, independent limit to a route, next to its normal one.
 *
 * Login uses it to count per email as well as per IP, and refresh to count per IP as well as per
 * token. Named throttlers in @nestjs/throttler run on every route by default, so the 'extra'
 * throttler is switched off unless a route opts in through this decorator (see isExtraThrottled).
 * Writing @Throttle({ extra: ... }) by hand won't work, because the opt-in marker would be missing.
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
