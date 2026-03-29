import { pgTable, uuid, text, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import { plans } from './plan.schema';
import { users } from './user.schema';

export const tenantStatus = pgEnum('tenant_status', [
  'active',
  'suspended',
  'cancelled',
  'pending',
]);

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  apiKeyHash: text('api_key_hash').unique().notNull(),
  apiKeyPrefix: text('api_key_prefix').notNull(),
  status: tenantStatus('status').default('pending'),

  // Foreign Keys
  planId: uuid('plan_id')
    .references(() => plans.id)
    .notNull(),
  ownerId: uuid('owner_id')
    .references(() => users.id)
    .notNull(),

  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .$onUpdateFn(() => new Date()),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
});
