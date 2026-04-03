// libs/database/src/database.module.ts
import {
    Global,
    Module,
    OnApplicationShutdown,
    Inject,
    Logger,
    Injectable,
} from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema'; // shared schema
import { DatabaseService } from './database.service';
import { ConfigModule } from '@app/common/config/config.module';
import { ConfigService } from '@nestjs/config';
import { DRIZZLE, PG_POOL } from '@app/common/lib';

@Injectable()
class PoolService implements OnApplicationShutdown {
    private readonly logger = new Logger(PoolService.name);
    constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

    async onApplicationShutdown(signal?: string) {
        this.logger.log(`Closing database pool (signal: ${signal})`);
        await this.pool.end();
    }
}

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: PG_POOL,
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const connectionString =
                    configService.get<string>('DATABASE_URL') ||
                    `postgresql://${configService.get('DATABASE_USERNAME')}:${configService.get('DATABASE_PASSWORD')}@${configService.get('DATABASE_HOST')}:${configService.get('DATABASE_PORT')}/${configService.get('DATABASE_NAME')}`;
                if (!connectionString) {
                    throw new Error(
                        'DATABASE_URL or database env vars missing',
                    );
                }

                const pool = new Pool({
                    connectionString,
                    max: configService.get<number>('DATABASE_POOL_MAX', 20),
                    idleTimeoutMillis: 30_000,
                    connectionTimeoutMillis: 5_000,
                });

                return pool;
            },
        },
        {
            provide: DRIZZLE,
            inject: [PG_POOL],
            useFactory: (pool: Pool) => drizzle(pool, { schema }),
        },
        PoolService,
        DatabaseService,
    ],
    exports: [DRIZZLE, DatabaseService],
})
export class DatabaseModule {}
