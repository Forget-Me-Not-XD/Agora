// ========== Imports: ==========
import { OnApplicationShutdown } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';

type ThrottlerStorageRecord = Awaited<ReturnType<ThrottlerStorage['increment']>>;

interface Entry {
    // When each hit that is still inside the window happened, oldest first
    hits: number[];
    // 0 when the key isn't blocked
    blockedUntil: number;
    ttl: number;
}

const SWEEP_INTERVAL_MS = 60_000;

/**
 * The throttler's counts in memory. Only used when Redis isn't available (see
 * ResilientThrottlerStorage).
 *
 * We don't use the library's ThrottlerStorageService because of two bugs. Its expiry timers are
 * kept per throttler instead of per key, so when one key's block ends, every other key's timers
 * are cleared too. Those hits never expire, and a busy bucket keeps growing until it blocks
 * everyone in it. It also never deletes old keys, and every refresh token creates one, so memory
 * keeps growing.
 *
 * Here each key keeps the times of its own hits and drops the old ones when it's used. A sweep
 * every minute deletes keys that haven't been used for a full window.
 */
export class InMemoryThrottlerStorage implements ThrottlerStorage, OnApplicationShutdown {
    private readonly entries = new Map<string, Entry>();
    private readonly sweepTimer = setInterval(() => this.sweep(), SWEEP_INTERVAL_MS).unref();

    increment(
        key: string,
        ttl: number,
        limit: number,
        blockDuration: number,
        throttlerName: string,
    ): Promise<ThrottlerStorageRecord> {
        const now = Date.now();
        const id = `${throttlerName}:${key}`;

        let entry = this.entries.get(id);
        if (!entry) {
            entry = { hits: [], blockedUntil: 0, ttl };
            this.entries.set(id, entry);
        }
        entry.ttl = ttl;

        // When a block ends, the key starts again from zero
        if (entry.blockedUntil && entry.blockedUntil <= now) {
            entry.blockedUntil = 0;
            entry.hits = [];
        }

        dropExpiredHits(entry, now);

        // Requests made while blocked aren't counted
        if (!entry.blockedUntil) {
            entry.hits.push(now);
            if (entry.hits.length > limit) {
                entry.blockedUntil = now + blockDuration;
            }
        }

        return Promise.resolve({
            totalHits:         entry.hits.length,
            timeToExpire:      entry.hits.length ? secondsUntil(entry.hits[0] + entry.ttl, now) : 0,
            isBlocked:         entry.blockedUntil > 0,
            timeToBlockExpire: entry.blockedUntil ? secondsUntil(entry.blockedUntil, now) : 0,
        });
    }

    onApplicationShutdown(): void {
        clearInterval(this.sweepTimer);
    }

    private sweep(): void {
        const now = Date.now();
        for (const [id, entry] of this.entries) {
            const lastHit = entry.hits[entry.hits.length - 1] ?? 0;
            if (entry.blockedUntil <= now && lastHit <= now - entry.ttl) {
                this.entries.delete(id);
            }
        }
    }
}

// A hit made at time t stops counting at t + ttl
function dropExpiredHits(entry: Entry, now: number): void {
    const firstLive = entry.hits.findIndex((at) => at > now - entry.ttl);
    if (firstLive === -1) {
        entry.hits = [];
    } else if (firstLive > 0) {
        entry.hits = entry.hits.slice(firstLive);
    }
}

// The guard reports these in whole seconds (Retry-After and the 429 message)
function secondsUntil(at: number, now: number): number {
    return Math.ceil((at - now) / 1000);
}
