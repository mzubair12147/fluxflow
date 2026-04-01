import { Injectable } from '@nestjs/common';
import { buildRateLimitKey } from './rate-limiter.constants';
import {
    FallbackBucket,
    RateLimitContext,
    RateLimitResult,
} from './rate-limiter.interface';

@Injectable()
export class RateLimiterFallBackService {
    private readonly buckets = new Map<string, FallbackBucket>();
    consume(context: RateLimitContext) {
        const key = buildRateLimitKey(context.tenantId);
        const now = Date.now();
        const windowMs = context.windowSeconds * 1000;

        let bucket = this.buckets.get(key);

        if (!bucket || now >= bucket.windowStart + windowMs) {
            for (const [k, b] of this.buckets.entries()) {
                if (now >= b.windowStart + windowMs) {
                    this.buckets.delete(k);
                }
            }

            bucket = { count: 0, windowStart: now };
            this.buckets.set(key, bucket);
        }

        const allowed = bucket.count < context.limit;

        if (allowed) {
            bucket.count++;
        }

        const remaining = Math.max(0, context.limit - bucket.count);
        const resetAt = Math.floor((bucket.windowStart + windowMs) / 1000);
        const result: RateLimitResult = {
            allowed,
            limit: context.limit,
            remaining,
            resetAt,
        };

        if (!allowed) {
            const retryAfter = bucket.windowStart + windowMs - now;
            result.retryAfter = Math.max(1, Math.ceil(retryAfter / 1000));
        }

        return result;
    }
}
