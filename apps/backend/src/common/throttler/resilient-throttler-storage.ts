// ========== Imports: ==========
import { Logger, OnApplicationShutdown } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { InMemoryThrottlerStorage } from './throttler-storage';
import { RedisThrottlerStorage } from './redis-throttler-storage';

type ThrottlerStorageRecord = Awaited<ReturnType<ThrottlerStorage['increment']>>;

// How long to leave Redis alone after it fails, before letting one request try it again
const REDIS_RETRY_DELAY_MS = 5_000;

/**
 * Counts in Redis so both pods share the limits, and in memory whenever Redis can't be reached.
 *
 * Redis is a single pod that gets replaced on a deploy (see deploy/redis.yaml), so it will be gone
 * for short periods. Every request goes through the throttler, so failing those requests would
 * take the API down with it. While Redis is gone the limits are counted per pod instead.
 *
 * If Redis hangs instead of refusing the connection, every call waits for the full command
 * timeout. So after a failure we skip Redis for a few seconds, then let one request check whether
 * it's back.
 *
 * Without a REDIS_URL it only counts in memory. The startup log says which one is in use.
 */
export class ResilientThrottlerStorage implements ThrottlerStorage, OnApplicationShutdown {
    private readonly logger = new Logger('ThrottlerStorage');
    private readonly memory = new InMemoryThrottlerStorage();
    private readonly redis?: RedisThrottlerStorage;
    private redisHealthy = true;
    // 0 while Redis is fine. After a failure, Redis is skipped until this time.
    private skipRedisUntil = 0;
    // Failures before the first connection attempt finishes are reported by the startup log below,
    // so don't log them here too
    private startupSettled = false;

    constructor(redisUrl?: string) {
        if (!redisUrl) {
            this.startupSettled = true;
            this.logger.warn('No REDIS_URL, so request limits are counted per pod');
            return;
        }

        this.redis = new RedisThrottlerStorage(redisUrl, (err) => this.noteRedisDown(describe(err)));
        void this.redis.waitUntilReady()
            .then(() => this.logger.log('Redis connected, request limits are shared by all pods'))
            .catch((err: Error) => {
                this.redisHealthy = false;
                this.logger.warn(`Could not reach Redis (${err.message}), counting request limits per pod until it answers`);
            })
            .finally(() => { this.startupSettled = true; });
    }

    async increment(
        key: string,
        ttl: number,
        limit: number,
        blockDuration: number,
        throttlerName: string,
    ): Promise<ThrottlerStorageRecord> {
        const now = Date.now();

        if (this.redis && now >= this.skipRedisUntil) {
            // Redis failed earlier, so this request is the one checking on it. Push the next check
            // out now, otherwise everything that arrives while this one waits would try Redis too.
            if (this.skipRedisUntil) this.skipRedisUntil = now + REDIS_RETRY_DELAY_MS;

            try {
                const record = await this.redis.increment(key, ttl, limit, blockDuration, throttlerName);
                this.skipRedisUntil = 0;
                this.noteRedisUp();
                return record;
            } catch (err) {
                this.skipRedisUntil = Date.now() + REDIS_RETRY_DELAY_MS;
                this.noteRedisDown(err instanceof Error ? describe(err) : String(err));
            }
        }

        return this.memory.increment(key, ttl, limit, blockDuration, throttlerName);
    }

    // Log the first failure and the recovery, not one line per request
    private noteRedisDown(reason: string): void {
        if (!this.redisHealthy || !this.startupSettled) return;
        this.redisHealthy = false;
        this.logger.warn(`Redis unavailable (${reason}), counting request limits per pod until it returns`);
    }

    private noteRedisUp(): void {
        if (this.redisHealthy) return;
        this.redisHealthy = true;
        this.logger.log('Redis is back, request limits are shared by all pods again');
    }

    onApplicationShutdown(): void {
        this.memory.onApplicationShutdown();
        this.redis?.onApplicationShutdown();
    }
}

// ioredis errors sometimes carry only a code, like ECONNREFUSED, and an empty message
function describe(err: Error): string {
    const code = (err as Error & { code?: string }).code;
    return err.message || code || err.name;
}
