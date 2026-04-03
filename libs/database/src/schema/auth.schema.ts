import {
    uuid,
    text,
    pgTable,
    pgEnum,
    timestamp,
    boolean,
    integer,
    check,
    uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const roleEnum = pgEnum('user_role', [
    'owner',
    'admin',
    'viewer',
    'developer',
]);

// ==========================================
// 1. Core Identity (Users) - The Vault
// ==========================================
export const users = pgTable(
    'users',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        email: text('email').notNull().unique(),

        // MUST be nullable for OAuth (Google/Apple) to work
        passwordHash: text('password_hash'),

        // Auth & Verification state
        emailVerified: boolean('email_verified').default(false).notNull(),
        emailVerifiedAt: timestamp('email_verified_at', {
            withTimezone: true,
            mode: 'date',
        }),
        emailVerificationToken: text('email_verification_token'),
        emailVerificationExpiresAt: timestamp('email_verification_expires_at', {
            withTimezone: true,
            mode: 'date',
        }),
        passwordResetToken: text('password_reset_token'),
        passwordResetExpiresAt: timestamp('password_reset_expires_at', {
            withTimezone: true,
            mode: 'date',
        }),

        // Activity & Soft Deletes
        lastLoginAt: timestamp('last_login_at', {
            withTimezone: true,
            mode: 'date',
        }),
        updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
            .defaultNow()
            .$onUpdate(() => new Date()),
        createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
            .defaultNow()
            .notNull(),
        deletedAt: timestamp('deleted_at', {
            withTimezone: true,
            mode: 'date',
        }),
    },
    (table) => ({
        // LAYER 3 STRICTNESS: The database absolutely refuses any user without an email.
        identityCheck: check('identity_check', sql`${table.email} IS NOT NULL`),
    }),
);

// ==========================================
// 2. Public Data (Profiles) - App Logic
// ==========================================
export const profiles = pgTable('profiles', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' })
        .unique(),

    // Separated Names mapping to standard OAuth given_name / family_name
    firstName: text('first_name').notNull(),
    lastName: text('last_name'),

    avatarUrl: text('avatar_url'),
    role: roleEnum('role').default('owner').notNull(),
});

// ==========================================
// 3. Social Logins (Accounts) - NextAuth Ready
// ==========================================
export const accounts = pgTable(
    'accounts',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        provider: text('provider').notNull(), // e.g., 'google', 'github'
        providerAccountId: text('provider_account_id').notNull(), // Unique ID from Provider
        refreshToken: text('refresh_token'),
        accessToken: text('access_token'),
        expiresAt: integer('expires_at'),
    },
    (table) => ({
        providerAccountUnique: uniqueIndex(
            'accounts_provider_provider_account_id_unique',
        ).on(table.provider, table.providerAccountId),
    }),
);

// ==========================================
// 4. Device Sessions - Refresh Token Rotation
// ==========================================
export const sessions = pgTable('sessions', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    sessionToken: text('session_token').notNull().unique(), // The Refresh Token
    expiresAt: timestamp('expires_at', {
        withTimezone: true,
        mode: 'date',
    }).notNull(),
    userAgent: text('user_agent'), // e.g., 'Mozilla/5.0 (iPhone...)'
    ipAddress: text('ip_address'),
});

//
//
//
//
//
//
//

// --------------------------------- previous -----------------------------------------

// import {
//   uuid,
//   text,
//   pgTable,
//   pgEnum,
//   timestamp,
//   boolean,
// } from 'drizzle-orm/pg-core';

// export const roleEnum = pgEnum('user_role', [
//   'owner',
//   'admin',
//   'viewer',
//   'developer',
// ]);

// export const users = pgTable('users', {
//   id: uuid('id').primaryKey().defaultRandom(),
//   email: text('email').notNull().unique(),
//   passwordHash: text('password_hash').notNull(),
//   avatarUrl: text('avatar_url'),
//   fullName: text('full_name').notNull(),
//   role: roleEnum('role').default('owner').notNull(),

//   // Auth & Verification
//   emailVerified: boolean('email_verified').default(false).notNull(),
//   emailVerificationToken: text('email_verification_token'),
//   passwordResetToken: text('password_reset_token'),
//   passwordResetExpiresAt: timestamp('password_reset_expires_at', {
//     withTimezone: true,
//   }),

//   // Activity & Soft Deletes
//   lastLoginAt: timestamp('last_login_at', { withTimezone: true, mode: 'date' }),
//   updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
//     .defaultNow()
//     .$onUpdate(() => new Date()),
//   createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
//     .defaultNow()
//     .notNull(),
//   deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'date' }),
// });
