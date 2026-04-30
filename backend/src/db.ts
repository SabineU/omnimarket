// backend/src/db.ts
// Database client setup – creates a PrismaClient connected to PostgreSQL
// using the official driver adapter and pg connection pool.
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Ensure the database URL is provided
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    '❌ DATABASE_URL is not set. Make sure your .env file contains the correct connection string.',
  );
}

// Create a new connection pool using the DATABASE_URL
const pool = new Pool({
  connectionString: databaseUrl,
});

// Create a Prisma adapter using the pool
const adapter = new PrismaPg(pool);

// Export a configured PrismaClient instance
export const prisma = new PrismaClient({ adapter });
