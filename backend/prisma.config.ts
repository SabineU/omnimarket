// backend/prisma.config.ts
import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';

// Explicitly load the .env file so DATABASE_URL is available
// before the Prisma CLI reads the configuration.
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    '❌ DATABASE_URL is not set. Make sure your .env file contains the correct connection string.',
  );
}

export default defineConfig({
  datasource: {
    url: databaseUrl,
  },
});
