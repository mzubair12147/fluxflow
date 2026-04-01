import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
    host: process.env.DATABASE_HOST,
    port: process.env.DATABASE_PORT,
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    dbUrl: process.env.DATABASE_URL,
    dbPoolMax: process.env.DATABASE_POOL_MAX,
    mongoUrl: process.env.MONGO_LOG_URI,
}));
