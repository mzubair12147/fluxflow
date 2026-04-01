import { REDIS_TOKEN, RedisHealthService } from '@app/redis';
import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { Logger } from 'nestjs-pino';
import { RateLimiterFallBackService } from './rate-limiter.fallback';
import {
    LuaScriptResult,
    RateLimitContext,
    RateLimitResult,
} from './rate-limiter.interface';
import {
    buildRateLimitKey,
    RATE_LIMIT_LUA_SCRIPT,
} from './rate-limiter.constants';

@Injectable()
export class RateLimiterService {
    constructor(
        private readonly logger: Logger,
        @Inject(REDIS_TOKEN) private readonly redisClient: Redis,
        private readonly redisHealthService: RedisHealthService,
        private readonly fallBackService: RateLimiterFallBackService,
    ) {}

    async consume(context: RateLimitContext): Promise<RateLimitResult> {
        const isRedisHealthy = await this.redisHealthService.ping();
        if (isRedisHealthy) {
            try {
                return await this.executeLuaScript(context);
            } catch (err) {
                this.logger.error(
                    `Lua script failed for tenant ${context.tenantId}`,
                    err,
                );
            }
        }

        this.logger.warn(
            `Redis unhealthy or script error - using in-memory fallback for tenant ${context.tenantId}`,
        );
        return this.fallBackService.consume(context);
    }

    private async executeLuaScript(
        context: RateLimitContext,
    ): Promise<RateLimitResult> {
        const key = buildRateLimitKey(context.tenantId);

        const raw = await this.redisClient.eval(
            RATE_LIMIT_LUA_SCRIPT,
            1,
            key,
            context.limit,
            context.windowSeconds * 1000,
            Date.now(),
        );

        const [count, allowedNum, ttl] = raw as number[];

        const luaResult: LuaScriptResult = {
            count,
            allowed: allowedNum === 1,
            ttl,
        };

        const nowSecond = Math.floor(Date.now() / 1000);
        const resetAt = nowSecond + Math.ceil(luaResult.ttl / 1000);

        const remaining = Math.max(0, context.limit - luaResult.count);

        const result: RateLimitResult = {
            allowed: luaResult.allowed,
            limit: context.limit,
            remaining,
            resetAt,
        };

        if (!luaResult.allowed) {
            result.retryAfter = Math.max(1, Math.ceil(luaResult.ttl / 1000));
        }

        return result;
    }
}
