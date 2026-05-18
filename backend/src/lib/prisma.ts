// backend/src/lib/prisma.ts
// Shared PrismaClient instance configured with the PostgreSQL adapter.
// All backend routes should import prisma from here instead of creating
// their own PrismaClient.
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// The DATABASE_URL must be set in your .env file
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export default prisma;
