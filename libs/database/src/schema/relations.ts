import { relations } from 'drizzle-orm';
import { users } from './auth.schema';
import { plans } from './plan.schema';
import { tenants } from './tenants.schema';
import { requestLogs } from './requestLogs.schema';
import { paymentDetails } from './paymentDetails.schema';
import { auditLogs } from './auditLogs.schema';

export const userRelations = relations(users, ({ many }) => ({
    tenants: many(tenants),
    auditLogs: many(auditLogs),
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
