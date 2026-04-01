import { Module } from '@nestjs/common';
import { ConfigModule as NestJSConfigModule } from '@nestjs/config';
import { configValidationSchema } from './validation.schema';
import databaseConfig from './configurations/database.config';
import redisConfig from './configurations/redis.config';
import jwtConfig from './configurations/jwt.config';

@Module({
    imports: [
        NestJSConfigModule.forRoot({
            isGlobal: true,
            load: [databaseConfig, redisConfig, jwtConfig],
            validationSchema: configValidationSchema,
        }),
    ],
})
export class ConfigModule {}
