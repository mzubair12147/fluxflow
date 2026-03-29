import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { pgEnum } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.schema';

export const paymentStatusEnum = pgEnum('payment_details_status', [
  'created',
  'requires_action',
  'processing',
  'authorized',
  'captured',
  'failed',
  'refunded',
  'canceled',
  'disputed',
]);

export const paymentDetails = pgTable('payment_details', {
  id: uuid('id').primaryKey().defaultRandom(),

  tenantId: uuid('tenant_id')
    .references(() => tenants.id, { onDelete: 'restrict' })
    .notNull()
    .unique(),
  provider: text('provider').notNull(),
  providerCustomerId: text('provider_customer_id').notNull(),
  status: paymentStatusEnum('status').default('created'),
  currentPeriodEnd: timestamp('current_period_end', {
    withTimezone: true,
    mode: 'date',
  }),

  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date()),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
  //   deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
});
