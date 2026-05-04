// backend/src/test-utils/reset-db.ts
// Utility to clean the database between tests.
// Uses Prisma's raw SQL to truncate all tables, preserving the schema.
// This should only be used in the test environment.

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * Creates a new Prisma client connected to the test database.
 * We don't reuse the app's client to avoid interfering with connection pooling.
 */
function getTestDb(): { prisma: PrismaClient; pool: Pool } {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set in test environment');
  }
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  return { prisma, pool };
}

/**
 * Truncates all tables in the correct order to avoid foreign key violations.
 * The list must match your schema; child tables are truncated before their parents.
 */
export async function resetTestDatabase(): Promise<void> {
  const { prisma, pool } = getTestDb();

  // Order is important: child tables first, then parents.
  // CASCADE ensures that any remaining references are also removed.
  const tables = [
    'coupon_usages',
    'coupons',
    'payments',
    'order_items',
    'orders',
    'cart_items',
    'reviews',
    'product_variations',
    'product_images',
    'products',
    'password_reset_tokens', // added in password reset flow
    'addresses',
    'seller_profiles',
    'categories', // self‑referencing, but we truncate children first
    'users',
  ];

  // Truncate each table with CASCADE – no special PostgreSQL privileges needed.
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
  }

  await prisma.$disconnect();
  await pool.end();
}
