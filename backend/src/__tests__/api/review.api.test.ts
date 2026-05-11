// backend/src/__tests__/api/review.api.test.ts
// API contract tests for review endpoints:
//   - POST /api/products/:productId/reviews (submit review)
//   - GET  /api/products/:productId/reviews (public review list)
//   - GET  /api/seller/reviews (seller dashboard)

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

describe('Review API', () => {
  let customerToken: string;
  let customerUserId: string;
  let sellerToken: string;
  let adminToken: string;
  let productId: string;
  let variationId: string;
  let addressId: string;

  beforeAll(async () => {
    // ---- 1. Create users ----
    const customer = await registerAndGetToken(
      'rev-customer@test.com',
      'CustomerPass1!',
      'Review Customer',
      'CUSTOMER',
    );
    customerToken = customer.token;
    customerUserId = customer.userId;

    const seller = await registerAndGetToken(
      'rev-seller@test.com',
      'SellerPass1!',
      'Review Seller',
      'SELLER',
    );
    sellerToken = seller.token;

    const admin = await registerAndGetToken('rev-admin@test.com', 'AdminPass1!', 'Review Admin');

    // Promote admin directly in DB
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
      .send({ email: 'rev-admin@test.com', password: 'AdminPass1!' })
      .expect(200);
    adminToken = adminLogin.body.data.tokens.accessToken;

    // ---- 2. Create address for the customer ----
    const addrRes = await request(app)
      .post('/api/users/me/addresses')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        street: '123 Review St',
        city: 'Testville',
        zipCode: '10001',
        country: 'USA',
        isDefault: true,
      })
      .expect(201);
    addressId = addrRes.body.data.address.id;

    // ---- 3. Create category and product (approved) ----
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
        name: 'Review Test Phone',
        description: 'A phone for testing reviews.',
        categoryId,
        basePrice: 500,
        brand: 'TestCo',
        variations: [{ sku: 'REV-PHONE', color: 'Blue', stockQty: 100, priceModifier: 0 }],
        images: [{ url: 'http://example.com/phone.jpg', altText: 'Phone' }],
      })
      .expect(201);
    productId = prodRes.body.data.product.id;
    variationId = prodRes.body.data.product.variations[0].id;

    // Approve product
    await request(app)
      .patch(`/api/admin/products/${productId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' })
      .expect(200);

    // ---- 4. Create a completed order so the customer "purchased" the product ----
    await setupPrisma.order.create({
      data: {
        customerId: customerUserId,
        status: 'CONFIRMED', // not cancelled/returned, so eligible for review
        shippingAddressId: addressId,
        totalAmount: 500,
        items: {
          create: [
            {
              productId,
              variationId,
              sellerId: seller.userId,
              quantity: 1,
              priceAtTime: 500,
            },
          ],
        },
      },
    });

    await setupPool.end();
    await setupPrisma.$disconnect();
  });

  // ==========================================================================
  // POST /api/products/:productId/reviews
  // ==========================================================================
  describe('POST /api/products/:productId/reviews', () => {
    it('should submit a review for a purchased product', async () => {
      const res = await request(app)
        .post(`/api/products/${productId}/reviews`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ rating: 5, comment: 'Excellent!' })
        .expect(201);

      expect(res.body.status).toBe('success');
      expect(res.body.data.review.rating).toBe(5);
      expect(res.body.data.averageRating).toBe(5);
      expect(res.body.data.reviewCount).toBe(1);
    });

    it('should prevent duplicate reviews', async () => {
      await request(app)
        .post(`/api/products/${productId}/reviews`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ rating: 3, comment: 'Okay' })
        .expect(400); // ReviewValidationError
    });

    it('should return 400 if the product was not purchased', async () => {
      // Create another customer who never bought anything
      const other = await registerAndGetToken(
        'rev-other@test.com',
        'OtherPass1!',
        'Other Customer',
      );
      await request(app)
        .post(`/api/products/${productId}/reviews`)
        .set('Authorization', `Bearer ${other.token}`)
        .send({ rating: 4 })
        .expect(400);
    });

    it('should return 400 for invalid rating (outside 1-5)', async () => {
      // Validation middleware runs before the service logic, so a rating of 6
      // will trigger a 400 from Zod regardless of purchase status.
      await request(app)
        .post(`/api/products/${productId}/reviews`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ rating: 6 })
        .expect(400); // Zod validation error
    });

    it('should return 401 without token', async () => {
      await request(app).post(`/api/products/${productId}/reviews`).send({ rating: 5 }).expect(401);
    });
  });

  // ==========================================================================
  // GET /api/products/:productId/reviews
  // ==========================================================================
  describe('GET /api/products/:productId/reviews', () => {
    it('should return paginated reviews for the product', async () => {
      const res = await request(app).get(`/api/products/${productId}/reviews`).expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.reviews.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.reviews[0].customer.name).toBeDefined();
      expect(res.body.data.pagination.totalItems).toBeGreaterThanOrEqual(1);
    });

    it('should return empty list for product with no reviews', async () => {
      const randomId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app).get(`/api/products/${randomId}/reviews`).expect(200);

      expect(res.body.data.reviews).toEqual([]);
      expect(res.body.data.pagination.totalItems).toBe(0);
    });
  });

  // ==========================================================================
  // GET /api/seller/reviews
  // ==========================================================================
  describe('GET /api/seller/reviews', () => {
    it('should return reviews for the seller’s products', async () => {
      const res = await request(app)
        .get('/api/seller/reviews')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.reviews.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.reviews[0].product.name).toBe('Review Test Phone');
    });

    it('should return 403 for a non-seller', async () => {
      await request(app)
        .get('/api/seller/reviews')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });

    it('should return 401 without token', async () => {
      await request(app).get('/api/seller/reviews').expect(401);
    });
  });
});
