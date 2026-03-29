import {
  uuid,
  text,
  pgTable,
  pgEnum,
  timestamp,
  boolean,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('user_role', [
  'owner',
  'admin',
  'viewer',
  'developer',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  avatarUrl: text('avatar_url'),
  fullName: text('full_name').notNull(),
  role: roleEnum('role').default('owner').notNull(),

  // Auth & Verification
  emailVerified: boolean('email_verified').default(false).notNull(),
  emailVerificationToken: text('email_verification_token'),
  passwordResetToken: text('password_reset_token'),
  passwordResetExpiresAt: timestamp('password_reset_expires_at', {
    withTimezone: true,
  }),

  // Activity & Soft Deletes
  lastLoginAt: timestamp('last_login_at', { withTimezone: true, mode: 'date' }),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date()),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
});
