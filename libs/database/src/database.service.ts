import { Inject, Injectable } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from './database.module';
import { sql } from 'drizzle-orm';

@Injectable()
export class DatabaseService {
    constructor(
        @Inject(DRIZZLE) private readonly db: NodePgDatabase<typeof schema>,
    ) {}

    async healthCheck(): Promise<boolean> {
        try {
            await this.db.execute(sql`SELECT 1`);
            return true;
        } catch {
            return false;
        }
    }
}
