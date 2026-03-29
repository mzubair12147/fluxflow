import { z } from 'zod';

export const configValidationSchema = z.object({
  // Database
  DATABASE_HOST: z.string().nonempty(),
  DATABASE_PORT: z.coerce.number().default(5432),
  DATABASE_URL: z.string().nonempty(),
  // Redis
  REDIS_HOST: z.coerce.string().nonempty(),
  REDIS_PORT: z.number().default(6379),
  // Kafka
  // KAFKA_BROKERS: z.string().nonempty(),
});
