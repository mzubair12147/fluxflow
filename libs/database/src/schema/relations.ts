import { relations } from 'drizzle-orm';
import { users, profiles, accounts, sessions } from './auth.schema';
import { plans } from './plan.schema';
import { tenants } from './tenants.schema';
import { requestLogs } from './requestLogs.schema';
import { paymentDetails } from './paymentDetails.schema';
import { auditLogs } from './auditLogs.schema';

export const userRelations = relations(users, ({ many, one }) => ({
    profile: one(profiles, {
        fields: [users.id],
        references: [profiles.userId],
    }),
    tenants: many(tenants),
    auditLogs: many(auditLogs),
    accounts: many(accounts),
    sessions: many(sessions),
}));

export const profileRelations = relations(profiles, ({ one }) => ({
    user: one(users, {
        fields: [profiles.userId],
        references: [users.id],
    }),
}));

export const accountRelations = relations(accounts, ({ one }) => ({
    user: one(users, {
        fields: [accounts.userId],
        references: [users.id],
    }),
}));

export const sessionRelations = relations(sessions, ({ one }) => ({
    user: one(users, {
        fields: [sessions.userId],
        references: [users.id],
    }),
}));

export const planRelations = relations(plans, ({ many }) => ({
    tenants: many(tenants),
}));

export const tenantRelations = relations(tenants, ({ one, many }) => ({
    plan: one(plans, {
        fields: [tenants.planId],
        references: [plans.id],
    }),
    owner: one(users, {
        fields: [tenants.ownerId],
        references: [users.id],
    }),
    paymentDetails: many(paymentDetails),
    requestLogs: many(requestLogs),
    auditLogs: many(auditLogs),
}));

export const requestLogRelations = relations(requestLogs, ({ one }) => ({
    tenant: one(tenants, {
        references: [tenants.id],
        fields: [requestLogs.tenantId],
    }),
}));

export const paymentRelations = relations(paymentDetails, ({ one }) => ({
    tenant: one(tenants, {
        fields: [paymentDetails.tenantId],
        references: [tenants.id],
    }),
}));

export const auditLogRelations = relations(auditLogs, ({ one }) => ({
    actor: one(users, {
        references: [users.id],
        fields: [auditLogs.actorId],
    }),
    tenant: one(tenants, {
        references: [tenants.id],
        fields: [auditLogs.tenantId],
    }),
}));
