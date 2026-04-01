import { REDIS_TOKEN } from './redis.constants';
import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Logger } from 'nestjs-pino';

export const RedisProvider: FactoryProvider = {
    provide: REDIS_TOKEN,
    useFactory: (configService: ConfigService, logger: Logger) => {
        const host = configService.get<string>('REDIS_HOST');
        const port = Number(configService.get<number | string>('REDIS_PORT') || 6379);

        if (!host) {
            throw new Error('REDIS_HOST is required for RedisProvider');
        }

        const client = new Redis({
            host,
            port,
            retryStrategy: (times) => Math.min(times * 50, 2000),
            // reconnectOnError: (err) => {
            //     const targetError = 'READONLY';
            //     if (err.message.includes(targetError)) return true;
            //     return false;
            // },
        });

        client.on('connect', () =>
            logger.log('Redis connecting...', 'RedisModule'),
        );
        client.on('ready', () =>
            logger.log('Redis client ready', 'RedisModule'),
        );
        client.on('error', (err) =>
            logger.error(`Redis error: ${err.message}`, 'RedisModule'),
        );
        return client;
    },
    inject: [ConfigService, Logger],
};
