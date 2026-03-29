import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../../.env') });

export default defineConfig({
  schema: './src/schema/index.ts',
  dialect: 'postgresql', // This is correct for newer versions
  dbCredentials: {
    url: process.env.DATABASE_URL as string,
  },
  verbose: true, // Add this to see the SQL it's trying to run
  strict: true,
});
