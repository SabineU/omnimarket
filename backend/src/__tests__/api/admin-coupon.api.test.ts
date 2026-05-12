/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/api/admin-coupon.api.test.ts
// API contract tests for admin coupon management:
//   - POST   /api/admin/coupons
//   - GET    /api/admin/coupons
//   - PUT    /api/admin/coupons/:id
//   - DELETE /api/admin/coupons/:id

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { resetTestDatabase } from '../../test-utils/setup.js';

async function registerAndGetToken(
  email: string,
  password: string,
  name: string,
  role: 'CUSTOMER' | 'SELLER' | 'ADMIN' = 'CUSTOMER',
): Promise<{ token: string; userId: string }> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password, name, role })
    .expect(201);
  return { token: res.body.data.tokens.accessToken, userId: res.body.data.user.id };
}

beforeAll(async () => {
  await resetTestDatabase();
}, 30000);

describe('Admin Coupon API', () => {
  let adminToken: string;
  let customerToken: string;
  let couponId: string;

  beforeAll(async () => {
    // Create admin
    const admin = await registerAndGetToken('coupon-admin@test.com', 'AdminPass1!', 'Coupon Admin');
    const { PrismaClient } = await import('@prisma/client');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });
    await prisma.user.update({ where: { id: admin.userId }, data: { role: 'ADMIN' } });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'coupon-admin@test.com', password: 'AdminPass1!' })
      .expect(200);
    adminToken = loginRes.body.data.tokens.accessToken;
    await pool.end();
    await prisma.$disconnect();

    // Create a customer for 403 test
    const customer = await registerAndGetToken(
      'coupon-customer@test.com',
      'CustomerPass1!',
      'Coupon Customer',
      'CUSTOMER',
    );
    customerToken = customer.token;
  });

  it('should create a new coupon', async () => {
    const res = await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: 'SAVE20',
        discountType: 'PERCENTAGE',
        discountValue: 20,
        minCartAmount: 100,
        usageLimit: 50,
      })
      .expect(201);

    expect(res.body.data.coupon.code).toBe('SAVE20');
    couponId = res.body.data.coupon.id;
  });

  it('should list all coupons', async () => {
    const res = await request(app)
      .get('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.coupons.length).toBeGreaterThanOrEqual(1);
  });

  it('should filter coupons by search', async () => {
    const res = await request(app)
      .get('/api/admin/coupons?search=SAVE')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.coupons.every((c: any) => c.code.includes('SAVE'))).toBe(true);
  });

  it('should update a coupon', async () => {
    const res = await request(app)
      .put(`/api/admin/coupons/${couponId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ discountValue: 25 })
      .expect(200);

    expect(res.body.data.coupon.discountValue).toBe(25);
  });

  it('should delete a coupon', async () => {
    await request(app)
      .delete(`/api/admin/coupons/${couponId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    // Verify it's gone
    const res = await request(app)
      .get('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.coupons.find((c: any) => c.id === couponId)).toBeUndefined();
  });

  it('should return 400 for missing required fields', async () => {
    await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: 'INCOMPLETE' }) // missing discountType, discountValue
      .expect(400);
  });

  it('should return 403 for non-admin', async () => {
    await request(app)
      .post('/api/admin/coupons')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ code: 'HACK', discountType: 'FIXED_AMOUNT', discountValue: 10 })
      .expect(403);
  });

  it('should return 401 without token', async () => {
    await request(app).get('/api/admin/coupons').expect(401);
  });
});
