// libs/database/src/database.module.ts
import {
    Global,
    Module,
    OnApplicationShutdown,
    Inject,
    Logger,
    Injectable,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from './schema'; // shared schema
import { DatabaseService } from './database.service';

export const DRIZZLE = Symbol('DRIZZLE');
const PG_POOL = Symbol('PG_POOL');

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
                    configService.get<string>('DATABASE_URL');
                if (!connectionString) throw new Error('DATABASE_URL missing');
                return new Pool({
                    connectionString,
                    max: configService.get<number>('DATABASE_POOL_MAX', 20),
                    idleTimeoutMillis: 30_000,
                    connectionTimeoutMillis: 5_000,
                });
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
