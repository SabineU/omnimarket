// backend/src/__tests__/api/seller-payout.api.test.ts
// API contract tests for:
//   - POST /api/seller/payouts
//   - GET  /api/admin/payouts
//   - PATCH /api/admin/payouts/:id

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

describe('Payout API', () => {
  let sellerToken: string;
  let sellerUserId: string;
  let customerToken: string;
  let adminToken: string;
  let productId: string;
  let variationId: string;
  let addressId: string;

  beforeAll(async () => {
    // Create users
    const seller = await registerAndGetToken(
      'payout-seller@test.com',
      'SellerPass1!',
      'Payout Seller',
      'SELLER',
    );
    sellerToken = seller.token;
    sellerUserId = seller.userId;

    const customer = await registerAndGetToken(
      'payout-customer@test.com',
      'CustomerPass1!',
      'Payout Customer',
      'CUSTOMER',
    );
    customerToken = customer.token;

    const admin = await registerAndGetToken('payout-admin@test.com', 'AdminPass1!', 'Payout Admin');

    // Promote admin in DB
    const { PrismaClient } = await import('@prisma/client');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const { Pool } = await import('pg');
    const setupPool = new Pool({ connectionString: process.env.DATABASE_URL });
    const setupAdapter = new PrismaPg(setupPool);
    const setupPrisma = new PrismaClient({ adapter: setupAdapter });
    await setupPrisma.user.update({
      where: { id: admin.userId },
      data: { role: 'ADMIN' },
    });
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'payout-admin@test.com', password: 'AdminPass1!' })
      .expect(200);
    adminToken = adminLogin.body.data.tokens.accessToken;

    // Create address for orders
    const addrRes = await request(app)
      .post('/api/users/me/addresses')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        street: 'Payout St',
        city: 'Test',
        zipCode: '00000',
        country: 'USA',
        isDefault: true,
      })
      .expect(201);
    addressId = addrRes.body.data.address.id;

    // Create category and approved product
    const catRes = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Electronics', slug: 'electronics' })
      .expect(201);
    const categoryId = catRes.body.data.category.id;

    const prodRes = await request(app)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Payout Phone',
        description: 'A phone for payout testing.',
        categoryId,
        basePrice: 1000,
        variations: [{ sku: 'PAY-PHONE', color: 'Red', stockQty: 50 }],
        images: [],
      })
      .expect(201);
    productId = prodRes.body.data.product.id;
    variationId = prodRes.body.data.product.variations[0].id;

    await request(app)
      .patch(`/api/admin/products/${productId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' })
      .expect(200);

    // Create a CONFIRMED order so the seller has net earnings (1000 * 1)
    await setupPrisma.order.create({
      data: {
        customerId: customer.userId,
        status: 'CONFIRMED',
        shippingAddressId: addressId,
        totalAmount: 1000,
        items: {
          create: [
            {
              productId,
              variationId,
              sellerId: sellerUserId,
              quantity: 1,
              priceAtTime: 1000,
            },
          ],
        },
      },
    });

    await setupPool.end();
    await setupPrisma.$disconnect();
  });

  // ---- Seller requests a payout ----
  it('should allow a seller to request a valid payout', async () => {
    const res = await request(app)
      .post('/api/seller/payouts')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ amount: 500 })
      .expect(201);

    expect(res.body.data.payout.status).toBe('PENDING');
    expect(res.body.data.payout.amount).toBe(500);
  });

  it('should reject a payout that exceeds net earnings', async () => {
    await request(app)
      .post('/api/seller/payouts')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ amount: 999999 })
      .expect(400);
  });

  it('should reject if seller already has a pending payout', async () => {
    await request(app)
      .post('/api/seller/payouts')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ amount: 100 })
      .expect(400);
  });

  it('should return 403 for customer', async () => {
    await request(app)
      .post('/api/seller/payouts')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ amount: 50 })
      .expect(403);
  });

  // ---- Admin list and process ----
  let payoutId: string;

  it('should list payouts for admin', async () => {
    const res = await request(app)
      .get('/api/admin/payouts')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.payouts.length).toBeGreaterThanOrEqual(1);
    payoutId = res.body.data.payouts[0].id;
  });

  it('should approve a pending payout', async () => {
    const res = await request(app)
      .patch(`/api/admin/payouts/${payoutId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'APPROVE', adminNote: 'Paid' })
      .expect(200);

    expect(res.body.data.payout.status).toBe('PAID');
  });

  it('should reject a non-pending payout', async () => {
    await request(app)
      .patch(`/api/admin/payouts/${payoutId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ action: 'REJECT' })
      .expect(400); // already PAID
  });

  it('should return 403 for customer on admin route', async () => {
    await request(app)
      .get('/api/admin/payouts')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });
});
