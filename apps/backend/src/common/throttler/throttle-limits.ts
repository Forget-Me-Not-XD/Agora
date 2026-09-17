// ========== Imports: ==========
import { minutes } from '@nestjs/throttler';

/**
 * Every throttle limit in the API, in one place.
 *
 * ttl is the window and limit is how many requests fit in it. Once a limit is hit, that bucket
 * stays blocked until the window has passed. Routes that aren't listed here get the baseline.
 */
export const THROTTLE_LIMITS = {
    // Every route, per user (or per IP when signed out), counted per route
    baseline: { limit: 60, ttl: minutes(1) },

    // One counter across all routes together. It sits far above what a person can do: a busy
    // admin with a few tabs open does roughly 150 to 200 requests a minute. It's only meant to
    // stop a runaway client or a script.
    // Signed-out requests count per IP here too, so keep this above the per-IP limits of the
    // public routes added together (login + register + refresh). Otherwise it quietly becomes
    // the real limit for a campus sitting behind one IP.
    overall: { limit: 600, ttl: minutes(1) },

    // Login is counted twice. The per-IP limit is loose, because a whole campus can share one
    // IP. The per-email limit is what stops someone going after a single account.
    loginPerIp:    { limit: 60, ttl: minutes(1) },
    loginPerEmail: { limit: 10, ttl: minutes(1) },

    register: { limit: 10, ttl: minutes(1) },

    // A successful refresh hands out a new token, which starts a fresh per-token bucket
    refreshPerToken: { limit: 30,  ttl: minutes(1) },
    refreshPerIp:    { limit: 300, ttl: minutes(1) },

    // A wrong current password doesn't count towards the account lockout, so this is the only
    // thing slowing down someone guessing it with a stolen access token
    changePassword: { limit: 5, ttl: minutes(1) },

    // Every call costs us a request to Geoapify
    places: { limit: 10, ttl: minutes(1) },
} as const;
