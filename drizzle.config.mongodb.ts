import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.MONGODB_URL) {
  throw new Error('MONGODB_URL environment variable is required');
}

export default defineConfig({
  schema: './shared/schema-mongodb.ts',
  out: './migrations/mongodb-drizzle',
  dialect: 'mongodb',
  dbCredentials: {
    url: process.env.MONGODB_URL,
  },
  verbose: true,
  strict: true,
});