// ========== Imports: ==========
import { randomBytes } from 'crypto';
import { OnApplicationShutdown } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';

type ThrottlerStorageRecord = Awaited<ReturnType<ThrottlerStorage['increment']>>;

const KEY_PREFIX = 'throttle:';

/**
 * Counts a hit inside Redis.
 *
 * Each key's hits are kept in a sorted set scored by time, and hits older than the window are
 * removed before counting, the same sliding window as InMemoryThrottlerStorage. It runs as one
 * script, so two pods can count the same key at once without losing hits.
 *
 * Going over the limit deletes the hits and sets a block key that expires after blockDuration.
 * While it exists, requests are refused without being counted. Once it expires, counting starts
 * from zero.
 *
 * Every key has an expiry, so unused keys disappear without a sweep.
 */
const HIT_SCRIPT = `
local hitsKey        = KEYS[1]
local blockKey       = KEYS[2]
local now            = tonumber(ARGV[1])
local ttl            = tonumber(ARGV[2])
local limit          = tonumber(ARGV[3])
local blockDuration  = tonumber(ARGV[4])
local member         = ARGV[5]

local blockLeft = redis.call('PTTL', blockKey)
if blockLeft > 0 then
  return { 0, 0, 1, blockLeft }
end

redis.call('ZREMRANGEBYSCORE', hitsKey, '-inf', now - ttl)
redis.call('ZADD', hitsKey, now, member)
redis.call('PEXPIRE', hitsKey, ttl)

local totalHits = redis.call('ZCARD', hitsKey)

if totalHits > limit then
  redis.call('DEL', hitsKey)
  redis.call('SET', blockKey, 1, 'PX', blockDuration)
  return { totalHits, 0, 1, blockDuration }
end

local oldest = redis.call('ZRANGE', hitsKey, 0, 0, 'WITHSCORES')
local timeToExpire = 0
if oldest[2] then
  timeToExpire = tonumber(oldest[2]) + ttl - now
end

return { totalHits, timeToExpire, 0, 0 }
`;

interface ThrottleRedis extends Redis {
    throttleHit(
        hitsKey: string,
        blockKey: string,
        now: string,
        ttl: string,
        limit: string,
        blockDuration: string,
        member: string,
    ): Promise<[number, number, number, number]>;
}

/**
 * Throttler counts in Redis, shared by every pod.
 *
 * The client is set up to give up quickly rather than wait: no queueing while disconnected, one
 * retry, and a short command timeout. ResilientThrottlerStorage turns those failures into counting
 * in memory instead, so a Redis restart never holds up a request.
 */
export class RedisThrottlerStorage implements ThrottlerStorage, OnApplicationShutdown {
    private readonly redis: ThrottleRedis;
    // Members of the sorted set have to be unique across pods. If two pods add the same member in
    // the same millisecond, Redis updates the score instead of adding a second hit, and the limit
    // ends up higher than configured.
    private readonly podId = randomBytes(4).toString('hex');
    private hitCounter = 0;

    constructor(url: string, onError: (err: Error) => void) {
        this.redis = new Redis(url, {
            enableOfflineQueue:    false,
            maxRetriesPerRequest:  1,
            commandTimeout:        250,
            connectTimeout:        1_000,
        }) as ThrottleRedis;

        // ioredis prints its own noise to the console for every failed connection attempt unless
        // someone listens, and an unhandled 'error' event would take the process down
        this.redis.on('error', onError);

        this.redis.defineCommand('throttleHit', { numberOfKeys: 2, lua: HIT_SCRIPT });
    }

    async increment(
        key: string,
        ttl: number,
        limit: number,
        blockDuration: number,
        throttlerName: string,
    ): Promise<ThrottlerStorageRecord> {
        const base = `${KEY_PREFIX}${throttlerName}:${key}`;
        const now = Date.now();
        const member = `${now}-${this.podId}-${this.hitCounter++}`;

        const [totalHits, timeToExpire, isBlocked, timeToBlockExpire] = await this.redis.throttleHit(
            `${base}:hits`,
            `${base}:blocked`,
            String(now),
            String(ttl),
            String(limit),
            String(blockDuration),
            member,
        );

        return {
            totalHits,
            timeToExpire:      msToSeconds(timeToExpire),
            isBlocked:         isBlocked === 1,
            timeToBlockExpire: msToSeconds(timeToBlockExpire),
        };
    }

    /**
     * Resolves once connected, rejects after timeoutMs. ioredis connects in the background, so the
     * startup log waits for this.
     */
    waitUntilReady(timeoutMs = 5_000): Promise<void> {
        if (this.redis.status === 'ready') return Promise.resolve();

        return new Promise((resolve, reject) => {
            const done = (err?: Error) => {
                clearTimeout(timer);
                this.redis.off('ready', onReady);
                err ? reject(err) : resolve();
            };
            const onReady = () => done();
            const timer = setTimeout(() => done(new Error(`no connection within ${timeoutMs}ms`)), timeoutMs);
            this.redis.once('ready', onReady);
        });
    }

    onApplicationShutdown(): void {
        this.redis.disconnect(false);
    }
}

// The guard reports these in whole seconds (Retry-After and the 429 message)
function msToSeconds(ms: number): number {
    return ms > 0 ? Math.ceil(ms / 1000) : 0;
}
