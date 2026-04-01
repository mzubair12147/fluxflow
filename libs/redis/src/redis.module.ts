import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { RedisProvider } from './redis.service';
import { REDIS_TOKEN } from './redis.constants';
import Redis from 'ioredis';
import { RedisHealthService } from './redis.health';
import { ConfigModule } from '@app/common/config/config.module';
import { LoggerModule } from 'y/logger';

@Global()
@Module({
    imports: [ConfigModule, LoggerModule],
    providers: [RedisProvider, RedisHealthService],
    exports: [REDIS_TOKEN, RedisHealthService],
})
export class RedisModule implements OnApplicationShutdown {
    constructor(@Inject(REDIS_TOKEN) private readonly redisClient: Redis) {}

    async onApplicationShutdown(signal?: string) {
        await this.redisClient.quit();
    }
}
