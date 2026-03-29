import { REDIS_TOKEN } from '@app/common/lib';
import { FactoryProvider, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const redisProvider: FactoryProvider = {
    provide: REDIS_TOKEN,
    useFactory: (configService: ConfigService) => {
        const redis = new Redis({
            host: configService.get('REDIS_HOST'),
            port: configService.get('REDIS_PORT'),
            retryStrategy: (times) => Math.min(times * 50, 2000), // Exponential backoff
            reconnectOnError: (err) => {
                const targetError = 'READONLY';
                if (err.message.includes(targetError)) return true;
                return false;
            },
        });

        redis.on('error', (err) => {
            console.log(`Redis client error: `, err);
        });
        return redis;
    },
    inject: [ConfigService],
};
