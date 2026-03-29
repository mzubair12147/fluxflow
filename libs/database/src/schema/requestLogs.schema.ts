import {
  pgTable,
  uuid,
  text,
  integer,
  smallint,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema';

export const requestLogs = pgTable('request_logs', {
  id: uuid('id').primaryKey().defaultRandom(),

  // relationships
  tenantId: uuid('tenant_id')
    .references(() => tenants.id)
    .notNull(),
  method: text('method').notNull(),
  path: text('path').notNull(),
  statusCode: smallint('status_code').notNull(),
  wasRateLimited: boolean('was_rate_limited').default(false),
  responseTimeMs: integer('response_time_ms').default(0),

  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
});
