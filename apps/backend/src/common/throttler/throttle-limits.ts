// ========== Imports: ==========
import { minutes } from '@nestjs/throttler';

/**
 * Every throttle limit in the API, in one place.
 *
 * ttl is the window and limit is how many requests fit in it. Once a limit is hit, that bucket
 * stays blocked until the window has passed. Routes that aren't listed here get the baseline.
 */
export const THROTTLE_LIMITS = {
    // Every route, per user (or per IP when signed out), counted per route. Normal use never gets
    // close: the busiest page makes 16 calls, and the user search reloads the page 300ms after
    // each pause in typing.
    baseline: { limit: 120, ttl: minutes(1) },

    // One counter across all routes, for runaway clients and scripts. An admin clicking through
    // pages for a full minute makes about 140 requests.
    // Signed-out requests are counted per IP here too, so keep this above login + register +
    // refresh per IP combined.
    overall: { limit: 600, ttl: minutes(1) },

    // The five routes that run the model. One prediction takes around 3.5 seconds on the pod,
    // so this is already more than a single pod can work through in a minute.
    prediction: { limit: 30, ttl: minutes(1) },

    // Login is counted twice over: per IP to catch one machine trying a common password against
    // many accounts, and per email because that is what protects a single account (see AuthController)
    loginPerIp:    { limit: 60, ttl: minutes(1) },
    loginPerEmail: { limit: 10, ttl: minutes(1) },

    register: { limit: 10, ttl: minutes(1) },

    // A successful refresh hands out a new token, which starts a fresh per-token bucket. The
    // per-IP limit is only a backstop for someone sending made-up tokens, so it stays wide: a
    // phone and a browser on the same network do share an address here.
    refreshPerToken: { limit: 30,  ttl: minutes(1) },
    refreshPerIp:    { limit: 300, ttl: minutes(1) },

    // A wrong current password doesn't count towards the account lockout, so this is the only
    // thing slowing down someone guessing it with a stolen access token
    changePassword: { limit: 5, ttl: minutes(1) },

    // Per email and IP together, so someone else can't use up a user's requests and lock them
    // out of asking for a link. The per-IP limit stops one machine spraying many addresses.
    forgotPasswordPerEmailIp: { limit: 3,  ttl: minutes(15) },
    forgotPasswordPerIp:      { limit: 20, ttl: minutes(15) },

    // Reset tokens are 256 random bits, so guessing them is hopeless and the limits are mostly
    // about load. Counted per token first, so a whole study centre behind one IP doesn't share
    // one small bucket; the per-IP limit is the backstop for made-up tokens.
    resetPasswordPerToken: { limit: 10, ttl: minutes(15) },
    resetPasswordPerIp:    { limit: 60, ttl: minutes(15) },

    // Every call costs us a request to Geoapify, and the address field searches 400ms after
    // each keystroke pause, so one address can take a handful of them
    places: { limit: 30, ttl: minutes(1) },
} as const;
