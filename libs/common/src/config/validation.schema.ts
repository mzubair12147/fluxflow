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
    MONGO_LOG_URI: z.string(),
    // Redis
    REDIS_HOST: z.coerce.string().nonempty(),
    REDIS_PORT: z.number().default(6379),
    // Kafka
    // KAFKA_BROKERS: z.string().nonempty(),

    // jwt secrets
    JWT_ACCESS_SECRET: z.string().nonempty(),
    JWT_REFRESH_SECRET: z.string().nonempty(),
});
