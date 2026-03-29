import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const plans = pgTable(
  'plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').unique().notNull(),

    // Storage optimized
    requestPerMinute: integer('request_per_minute').default(0).notNull(),
    requestPerDay: integer('request_per_day').default(0).notNull(),
    burstLimit: integer('burst_limit').default(0).notNull(),

    isActive: boolean('is_active').default(true).notNull(),

    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .$onUpdateFn(() => new Date()),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    plansActiveIdx: index('plans_active_idx').on(table.isActive),
    plansNameIdx: index('plans_name_idx').on(table.name),

    rpmNonNegative: check('rpm_check', sql`${table.requestPerMinute} >= 0`),
    rpdNonNegative: check('rpd_check', sql`${table.requestPerDay} >= 0`),
    burstNonNegative: check('burst_limit_check', sql`${table.burstLimit} >= 0`),
  }),
);
