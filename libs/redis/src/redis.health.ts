import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_TOKEN } from './redis.constants';

@Injectable()
export class RedisHealthService {
    constructor(@Inject(REDIS_TOKEN) private readonly redis: Redis) {}

    async ping(): Promise<boolean> {
        try {
            const result = await this.redis.ping();
            return result === 'PONG';
        } catch (error) {
            return false;
        }
    }
}
