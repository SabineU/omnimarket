// backend/src/__tests__/api/admin.api.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { resetTestDatabase } from '../../test-utils/setup.js';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

beforeAll(async () => {
  await resetTestDatabase();
}, 30000);

function createTempPrisma(): { prisma: PrismaClient; pool: Pool } {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  return { prisma, pool };
}

async function registerAndGetToken(
  email: string,
  password: string,
  name: string,
  role?: 'CUSTOMER' | 'SELLER',
): Promise<{ token: string; userId: string }> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password, name, role })
    .expect(201);
  return { token: res.body.data.tokens.accessToken, userId: res.body.data.user.id };
}

describe('Admin seller approval', () => {
  let adminToken: string;
  let sellerId: string;

  beforeAll(async () => {
    // 1. Create a user to promote (default role CUSTOMER)
    const { userId } = await registerAndGetToken(
      'admin-promoted@test.com',
      'AdminPass1!',
      'Admin User',
    );

    // 2. Promote to ADMIN
    const { prisma: p, pool } = createTempPrisma();
    await p.user.update({ where: { id: userId }, data: { role: 'ADMIN' } });
    await pool.end();
    await p.$disconnect();

    // 3. Login as admin to get a token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin-promoted@test.com', password: 'AdminPass1!' })
      .expect(200);
    adminToken = loginRes.body.data.tokens.accessToken;

    // 4. Create a seller user
    const { userId: sId } = await registerAndGetToken(
      'seller-approve@test.com',
      'SellerPass1!',
      'Seller Approve',
      'SELLER',
    );
    sellerId = sId;

    // 5. Create seller profile directly
    const { prisma: p2, pool: pool2 } = createTempPrisma();
    await p2.sellerProfile.create({
      data: { userId: sellerId, storeName: 'To Approve', isApproved: false },
    });
    await pool2.end();
    await p2.$disconnect();
  });

  it('should approve a seller', async () => {
    const res = await request(app)
      .patch(`/api/admin/sellers/${sellerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isApproved: true })
      .expect(200);
    expect(res.body.data.profile.isApproved).toBe(true);
  });

  it('should reject a seller', async () => {
    const res = await request(app)
      .patch(`/api/admin/sellers/${sellerId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isApproved: false })
      .expect(200);
    expect(res.body.data.profile.isApproved).toBe(false);
  });

  it('should return 403 for a non-admin user', async () => {
    const { token: custToken } = await registerAndGetToken(
      'random-customer@test.com',
      'RandomPass1!',
      'Random',
      'CUSTOMER',
    );
    await request(app)
      .patch(`/api/admin/sellers/${sellerId}`)
      .set('Authorization', `Bearer ${custToken}`)
      .send({ isApproved: true })
      .expect(403);
  });

  it('should return 401 without a token', async () => {
    await request(app)
      .patch(`/api/admin/sellers/${sellerId}`)
      .send({ isApproved: true })
      .expect(401);
  });
});
