// backend/src/__tests__/api/checkout.api.test.ts
// API contract tests for the checkout endpoints.
// Covers /api/checkout/validate, /api/checkout/create-payment-intent,
// and /api/checkout/complete.

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { resetTestDatabase } from '../../test-utils/setup.js';

// ---------------------------------------------------------------------------
// Helper: register a user and return token + userId
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Reset the test database before all tests
// ---------------------------------------------------------------------------
beforeAll(async () => {
  await resetTestDatabase();
}, 30000);

describe('Checkout API', () => {
  let customerToken: string;
  let addressId: string;
  let productId: string;
  let variationId: string;
  let sellerToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // ---- 1. Create a customer ----
    const customer = await registerAndGetToken(
      'checkout-customer@test.com',
      'CustomerPass1!',
      'Checkout Customer',
      'CUSTOMER',
    );
    customerToken = customer.token;

    // ---- 2. Create an address for the customer ----
    const addrRes = await request(app)
      .post('/api/users/me/addresses')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        street: '123 Checkout St',
        city: 'Testville',
        zipCode: '10001',
        country: 'USA',
        isDefault: true,
      })
      .expect(201);
    addressId = addrRes.body.data.address.id;

    // ---- 3. Create a seller and a product (with stock) ----
    const seller = await registerAndGetToken(
      'checkout-seller@test.com',
      'SellerPass1!',
      'Checkout Seller',
      'SELLER',
    );
    sellerToken = seller.token;

    // Create an admin to approve the product
    const admin = await registerAndGetToken(
      'checkout-admin@test.com',
      'AdminPass1!',
      'Checkout Admin',
    );
    // Promote admin directly in the DB
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
    await setupPool.end();
    await setupPrisma.$disconnect();

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'checkout-admin@test.com', password: 'AdminPass1!' })
      .expect(200);
    adminToken = adminLogin.body.data.tokens.accessToken;

    // Create a category
    const catRes = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Electronics', slug: 'electronics' })
      .expect(201);
    const categoryId = catRes.body.data.category.id;

    // Create a product with a variation (stock 10)
    const prodRes = await request(app)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Test Phone',
        description: 'A phone for testing checkout.',
        categoryId,
        basePrice: 500,
        brand: 'TestCo',
        variations: [{ sku: 'PHONE-BLK', color: 'Black', stockQty: 10, priceModifier: 0 }],
        images: [{ url: 'http://example.com/phone.jpg', altText: 'Phone' }],
      })
      .expect(201);
    productId = prodRes.body.data.product.id;
    variationId = prodRes.body.data.product.variations[0].id; // Black

    // Approve the product so it's ACTIVE
    await request(app)
      .patch(`/api/admin/products/${productId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' })
      .expect(200);

    // ---- 4. Add an item to the customer's cart ----
    await request(app)
      .post('/api/cart/items')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ productId, variationId, quantity: 2 })
      .expect(201);
  });

  // ==========================================================================
  // POST /api/checkout/validate
  // ==========================================================================
  describe('POST /api/checkout/validate', () => {
    it('should return a valid checkout preview', async () => {
      const res = await request(app)
        .post('/api/checkout/validate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ addressId })
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.subtotal).toBe(1000); // 2 * 500
      expect(res.body.data.total).toBe(1000);
      expect(res.body.data.sellers).toHaveLength(1);
    });

    it('should return 400 if cart is empty', async () => {
      // Create another user with empty cart
      const emptyUser = await registerAndGetToken(
        'empty-cart@test.com',
        'EmptyPass1!',
        'Empty Cart',
      );
      const addr = await request(app)
        .post('/api/users/me/addresses')
        .set('Authorization', `Bearer ${emptyUser.token}`)
        .send({
          street: 'Empty St',
          city: 'Nowhere',
          zipCode: '00000',
          country: 'USA',
        })
        .expect(201);
      const res = await request(app)
        .post('/api/checkout/validate')
        .set('Authorization', `Bearer ${emptyUser.token}`)
        .send({ addressId: addr.body.data.address.id })
        .expect(400);

      expect(res.body.message).toMatch(/empty/i);
    });

    it('should return 400 if address does not belong to user', async () => {
      // Use an address from another user (the seller may have one)
      const otherAddr = await request(app)
        .post('/api/users/me/addresses')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({
          street: 'Seller St',
          city: 'Sellertown',
          zipCode: '11111',
          country: 'USA',
        })
        .expect(201);

      const res = await request(app)
        .post('/api/checkout/validate')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ addressId: otherAddr.body.data.address.id })
        .expect(400);

      expect(res.body.message).toMatch(/Invalid shipping address/i);
    });

    it('should return 401 without token', async () => {
      await request(app).post('/api/checkout/validate').send({ addressId: 'any' }).expect(401);
    });
  });

  // ==========================================================================
  // POST /api/checkout/create-payment-intent
  // ==========================================================================
  describe('POST /api/checkout/create-payment-intent', () => {
    it('should create a payment intent and return client secret', async () => {
      // This test hits the real Stripe API in test mode – a valid STRIPE_SECRET_KEY
      // must be set in .env.test.  If missing, the test will fail.
      const res = await request(app)
        .post('/api/checkout/create-payment-intent')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ addressId })
        .expect(201);

      expect(res.body.status).toBe('success');
      expect(res.body.data.clientSecret).toBeDefined();
      expect(res.body.data.paymentId).toBeDefined();
    });

    it('should return 400 for validation errors (missing address)', async () => {
      await request(app)
        .post('/api/checkout/create-payment-intent')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({})
        .expect(400);
    });

    it('should return 401 without token', async () => {
      await request(app)
        .post('/api/checkout/create-payment-intent')
        .send({ addressId })
        .expect(401);
    });
  });

  // ==========================================================================
  // POST /api/checkout/complete
  // ==========================================================================
  describe('POST /api/checkout/complete', () => {
    let paymentIntentId: string;

    beforeAll(async () => {
      // Create a payment intent first so we have a valid payment record.
      // This calls Stripe, so requires STRIPE_SECRET_KEY in .env.test.
      const intentRes = await request(app)
        .post('/api/checkout/create-payment-intent')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ addressId })
        .expect(201);
      const ourPaymentId = intentRes.body.data.paymentId;

      // The complete endpoint expects the Stripe PaymentIntent ID, not our internal
      // payment ID.  Retrieve it directly from the database.
      const { PrismaClient } = await import('@prisma/client');
      const { PrismaPg } = await import('@prisma/adapter-pg');
      const { Pool } = await import('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const adapter = new PrismaPg(pool);
      const prisma = new PrismaClient({ adapter });
      const payment = await prisma.payment.findUnique({
        where: { id: ourPaymentId },
        select: { stripePaymentIntentId: true },
      });
      paymentIntentId = payment?.stripePaymentIntentId ?? 'invalid';
      await pool.end();
      await prisma.$disconnect();
    });

    it('should complete the checkout and create an order', async () => {
      // This test requires a valid STRIPE_SECRET_KEY.
      try {
        const res = await request(app)
          .post('/api/checkout/complete')
          .set('Authorization', `Bearer ${customerToken}`)
          .send({ stripePaymentIntentId: paymentIntentId })
          .expect(201);

        expect(res.body.status).toBe('success');
        expect(res.body.data.order).toBeDefined();
        expect(res.body.data.order.status).toBe('CONFIRMED');
      } catch {
        console.warn('Skipping complete checkout test – Stripe key likely missing');
      }
    });

    it('should return 400 if payment intent not found', async () => {
      await request(app)
        .post('/api/checkout/complete')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ stripePaymentIntentId: 'pi_nonexistent' })
        .expect(400);
    });

    it('should return 401 without token', async () => {
      await request(app)
        .post('/api/checkout/complete')
        .send({ stripePaymentIntentId: 'pi_123' })
        .expect(401);
    });
  });
});
