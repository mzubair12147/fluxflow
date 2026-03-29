import { uuid, text, pgTable, timestamp, json } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema';
import { users } from './user.schema';

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),

  actorId: uuid('actor_id').references(() => users.id),
  tenantId: uuid('tenant_id').references(() => tenants.id),

  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id'),
  beforeState: json('before_state'),
  afterState: json('after_state'),
  ipAddress: text('ip_address'),

  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
});
