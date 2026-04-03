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
            // validationSchema: only joi schema is accepted so zod will not work here.
            // for zod do the below thing
            validate: (config) => {
                const parsed = configValidationSchema.safeParse(config);
                if (!parsed.success) {
                    throw new Error(
                        `Config validation error: ${parsed.error.message}`,
                    );
                }

                return parsed.data;
            },
        }),
    ],
})
export class ConfigModule {}
