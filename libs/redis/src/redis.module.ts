import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { redisProvider } from './redis.service';
import { REDIS_TOKEN } from '@app/common/lib';
import Redis from 'ioredis';
import { ConfigModule } from '@nestjs/config';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [redisProvider],
    exports: [REDIS_TOKEN],
})
export class RedisModule implements OnApplicationShutdown {
    constructor(@Inject(REDIS_TOKEN) private readonly redisClient: Redis) {}

    async onApplicationShutdown(signal?: string) {
        await this.redisClient.quit();
    }
}
