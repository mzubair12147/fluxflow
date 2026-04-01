import { Module } from '@nestjs/common';
import { RateLimiterService } from './rate-limiter.service';
import { RedisModule } from '@app/redis';
import { LoggerModule } from 'y/logger';
import { RateLimiterFallBackService } from './rate-limiter.fallback';

@Module({
    imports: [RedisModule, LoggerModule],
    providers: [RateLimiterService, RateLimiterFallBackService],
    exports: [RateLimiterService],
})
export class RateLimiterModule {}
