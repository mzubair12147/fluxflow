import { z } from 'zod';

export const configValidationSchema = z.object({
    // Database
    DATABASE_HOST: z.string().nonempty(),
    DATABASE_PORT: z.coerce.number().default(5432),
    DATABASE_USERNAME: z.string(),
    DATABASE_PASSWORD: z.string(),
    DATABASE_URL: z.string().nonempty(),
    DATABASE_POOL_MAX: z.coerce.number().default(10),
    // mongodb connection string
    MONGO_LOG_URI: z.string().optional(),
    // Redis
    REDIS_HOST: z.coerce.string().nonempty(),
    REDIS_PORT: z.coerce.number().default(6379),
    // Kafka
    // KAFKA_BROKERS: z.string().nonempty(),

    // jwt secrets
    JWT_ACCESS_SECRET: z.string().nonempty(),
    JWT_REFRESH_SECRET: z.string().nonempty(),

    // auth behavior
    AUTH_EMAIL_VERIFICATION_TTL_MINUTES: z.coerce
        .number()
        .positive()
        .optional(),
    AUTH_PASSWORD_RESET_TTL_MINUTES: z.coerce.number().positive().optional(),
    AUTH_RETURN_DEBUG_TOKENS: z.enum(['true', 'false']).optional(),
    AUTH_FRONTEND_BASE_URL: z.string().url().optional(),
    AUTH_EMAIL_VERIFICATION_URL: z.string().optional(),
    AUTH_PASSWORD_RESET_URL: z.string().optional(),
    AUTH_SMTP_SECURE: z.enum(['true', 'false']).optional(),

    // smtp
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().positive().optional(),
    SMTP_FROM: z.string().email().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),

    // oauth
    AUTH_GOOGLE_CLIENT_IDS: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),

    // api security
    CORS_ORIGIN: z.string().optional(),
});
