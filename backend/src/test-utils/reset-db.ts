// backend/src/test-utils/reset-db.ts
// Utility to clean the database between tests.
// Uses Prisma's raw SQL to truncate all tables, preserving the schema.
// This should only be used in the test environment.
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

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

export async function resetTestDatabase(): Promise<void> {
  const { prisma, pool } = getTestDb();

  // Truncate all tables in the correct order to avoid foreign key violations.
  // This list must match your schema; order matters (child tables first).
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
    'seller_profiles',
    'addresses',
    'categories', // child of itself; truncate with CASCADE
    'users',
  ];

  // Disable foreign key checks for the session (PostgreSQL accepts CASCADE)
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'replica';`);

  for (const table of tables) {
    // CASCADE ensures that self-referencing and child rows are also removed
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
  }

  // Re-enable foreign key checks
  await prisma.$executeRawUnsafe(`SET session_replication_role = 'origin';`);

  await prisma.$disconnect();
  await pool.end();
}
