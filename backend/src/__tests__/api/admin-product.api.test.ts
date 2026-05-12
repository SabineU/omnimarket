/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/api/admin-product.api.test.ts
// API contract tests for admin product moderation endpoints:
//   - GET   /api/admin/products
//   - PATCH /api/admin/products/:id/status

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

describe('Admin Product Moderation API', () => {
  let adminToken: string;
  let sellerToken: string;
  let customerToken: string;
  let productId: string;

  beforeAll(async () => {
    // Create admin
    const admin = await registerAndGetToken(
      'prod-mod-admin@test.com',
      'AdminPass1!',
      'Prod Mod Admin',
    );
    const { PrismaClient } = await import('@prisma/client');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });
    await prisma.user.update({ where: { id: admin.userId }, data: { role: 'ADMIN' } });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'prod-mod-admin@test.com', password: 'AdminPass1!' })
      .expect(200);
    adminToken = loginRes.body.data.tokens.accessToken;

    // Create seller and a product
    const seller = await registerAndGetToken(
      'prod-mod-seller@test.com',
      'SellerPass1!',
      'Prod Mod Seller',
      'SELLER',
    );
    sellerToken = seller.token;

    // Create a category via admin
    const catRes = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'TestCat', slug: 'testcat' })
      .expect(201);
    const categoryId = catRes.body.data.category.id;

    // Create a product (DRAFT by default)
    const prodRes = await request(app)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Test Product',
        description: 'A product for moderation testing.',
        categoryId,
        basePrice: 100,
      })
      .expect(201);
    productId = prodRes.body.data.product.id;

    // Create a customer for 403 test
    const customer = await registerAndGetToken(
      'prod-mod-customer@test.com',
      'CustomerPass1!',
      'Prod Mod Customer',
      'CUSTOMER',
    );
    customerToken = customer.token;

    await pool.end();
    await prisma.$disconnect();
  });

  it('should list all products', async () => {
    const res = await request(app)
      .get('/api/admin/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.products.length).toBeGreaterThanOrEqual(1);
  });

  it('should filter products by status', async () => {
    const res = await request(app)
      .get('/api/admin/products?status=DRAFT')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.products.every((p: any) => p.status === 'DRAFT')).toBe(true);
  });

  it('should approve a product (change status to ACTIVE)', async () => {
    const res = await request(app)
      .patch(`/api/admin/products/${productId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' })
      .expect(200);

    expect(res.body.data.product.status).toBe('ACTIVE');
  });

  it('should return 400 for an invalid status', async () => {
    await request(app)
      .patch(`/api/admin/products/${productId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'UNKNOWN' })
      .expect(400);
  });

  it('should return 403 for non-admin', async () => {
    await request(app)
      .patch(`/api/admin/products/${productId}/status`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'ACTIVE' })
      .expect(403);
  });

  it('should return 401 without token', async () => {
    await request(app).get('/api/admin/products').expect(401);
  });
});
