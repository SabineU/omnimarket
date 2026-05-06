/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/api/cart.api.test.ts
// API contract tests for all shopping cart endpoints.
// Covers GET /api/cart, POST /api/cart/items, PATCH /api/cart/items/:itemId,
// DELETE /api/cart/items/:itemId, POST /api/cart/merge, POST /api/cart/validate-coupon.
// All endpoints require a valid access token.

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { resetTestDatabase } from '../../test-utils/setup.js';

// Helper: register a user and return token + userId
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

describe('Shopping Cart API', () => {
  let customerToken: string;
  let productId: string; // product with variations
  let variationId: string; // a specific variation with stock 10
  let anotherProductId: string; // product with no variations (out of stock)
  let otherCustomerToken: string;

  beforeAll(async () => {
    // =========================================================================
    // 1. Create users
    // =========================================================================
    const customer = await registerAndGetToken(
      'customer@test.com',
      'CustomerPass1!',
      'Shop Cart User',
      'CUSTOMER',
    );
    customerToken = customer.token;

    const other = await registerAndGetToken(
      'other-customer@test.com',
      'OtherPass1!',
      'Other Customer',
      'CUSTOMER',
    );
    otherCustomerToken = other.token;

    const seller = await registerAndGetToken(
      'seller@test.com',
      'SellerPass1!',
      'Seller Cart',
      'SELLER',
    );
    const sellerToken = seller.token;

    const admin = await registerAndGetToken('admin-cart@test.com', 'AdminPass1!', 'Admin Cart');

    // =========================================================================
    // 2. Promote admin and create prerequisites (category, products, coupons)
    // =========================================================================
    const { PrismaClient } = await import('@prisma/client');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const { Pool } = await import('pg');

    const setupPool = new Pool({ connectionString: process.env.DATABASE_URL });
    const setupAdapter = new PrismaPg(setupPool);
    const setupPrisma = new PrismaClient({ adapter: setupAdapter });

    // Promote admin user
    await setupPrisma.user.update({
      where: { id: admin.userId },
      data: { role: 'ADMIN' },
    });

    // Login as admin to get a token for further API calls
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin-cart@test.com', password: 'AdminPass1!' })
      .expect(200);
    const adminToken = adminLogin.body.data.tokens.accessToken;

    // Create a category
    const catRes = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Electronics', slug: 'electronics' })
      .expect(201);
    const categoryId = catRes.body.data.category.id;

    // Create a product with two variations (stock 10 each)
    const prodRes = await request(app)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Test Phone',
        description: 'A phone used for testing the cart.',
        categoryId,
        basePrice: 500,
        brand: 'TestCo',
        variations: [
          { sku: 'PHONE-BLK', color: 'Black', stockQty: 10, priceModifier: 0 },
          { sku: 'PHONE-WHT', color: 'White', stockQty: 10, priceModifier: 20 },
        ],
        images: [{ url: 'http://example.com/phone.jpg', altText: 'Phone' }],
      })
      .expect(201);
    productId = prodRes.body.data.product.id;
    variationId = prodRes.body.data.product.variations[0].id; // Black, stock 10

    // Approve the product
    await request(app)
      .patch(`/api/admin/products/${productId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' })
      .expect(200);

    // Create a second product with no variations (effectively 0 stock)
    const prod2Res = await request(app)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'No Stock Item',
        description: 'This product has no stock.',
        categoryId,
        basePrice: 10,
        brand: 'TestCo',
        variations: [],
        images: [],
      })
      .expect(201);
    anotherProductId = prod2Res.body.data.product.id;

    // Create coupons directly in the database
    await setupPrisma.coupon.create({
      data: {
        code: 'SAVE10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minCartAmount: 0,
        usageLimit: 100,
        usedCount: 0,
        expiresAt: new Date(Date.now() + 86400_000),
      },
    });
    await setupPrisma.coupon.create({
      data: {
        code: 'EXPIRED20',
        discountType: 'FIXED_AMOUNT',
        discountValue: 20,
        minCartAmount: 0,
        usageLimit: null,
        usedCount: 0,
        expiresAt: new Date(Date.now() - 86400_000),
      },
    });
    await setupPrisma.coupon.create({
      data: {
        code: 'LIMIT1',
        discountType: 'FIXED_AMOUNT',
        discountValue: 5,
        minCartAmount: 0,
        usageLimit: 1,
        usedCount: 1,
        expiresAt: new Date(Date.now() + 86400_000),
      },
    });

    // Cleanup the temporary Prisma connection
    await setupPool.end();
    await setupPrisma.$disconnect();
  });

  // ========================================================================
  // GET /api/cart
  // ========================================================================
  describe('GET /api/cart', () => {
    it('should return an empty cart for a new user', async () => {
      const res = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data.items).toEqual([]);
    });

    it('should return 401 without a token', async () => {
      await request(app).get('/api/cart').expect(401);
    });
  });

  // ========================================================================
  // POST /api/cart/items
  // ========================================================================
  describe('POST /api/cart/items', () => {
    it('should add an item to the cart', async () => {
      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId, variationId, quantity: 2 })
        .expect(201);

      expect(res.body.data.cartItem.quantity).toBe(2);
      expect(res.body.data.cartItem.productId).toBe(productId);
    });

    it('should increment quantity when adding the same item again', async () => {
      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId, variationId, quantity: 3 })
        .expect(201);

      expect(res.body.data.cartItem.quantity).toBe(5); // 2 + 3
    });

    it('should cap combined quantity at 99', async () => {
      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId, variationId, quantity: 100 })
        .expect(201);

      expect(res.body.data.cartItem.quantity).toBe(99);
    });

    it('should return 409 if quantity exceeds stock (fresh user)', async () => {
      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .send({ productId, variationId, quantity: 11 }) // variation stock is 10
        .expect(409);

      expect(res.body.message).toMatch(/available|stock/i);
    });

    it('should return 409 if product is out of stock', async () => {
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: anotherProductId, quantity: 1 })
        .expect(409);
    });

    it('should return 400 for invalid productId', async () => {
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId: 'invalid-uuid' })
        .expect(400);
    });

    it('should return 401 without token', async () => {
      await request(app).post('/api/cart/items').send({ productId, quantity: 1 }).expect(401);
    });
  });

  // ========================================================================
  // PATCH /api/cart/items/:itemId
  // ========================================================================
  describe('PATCH /api/cart/items/:itemId', () => {
    let cartItemId: string;

    beforeAll(async () => {
      // The customer already has one item (quantity 99 after previous tests).
      // We'll use that item.
      const cart = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);
      cartItemId = cart.body.data.items[0]?.id;
    });

    it('should update the quantity of an existing item', async () => {
      const res = await request(app)
        .patch(`/api/cart/items/${cartItemId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 1 })
        .expect(200);

      expect(res.body.data.cartItem.quantity).toBe(1);
    });

    it('should return 409 if new quantity exceeds stock', async () => {
      await request(app)
        .patch(`/api/cart/items/${cartItemId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 100 })
        .expect(409);
    });

    it('should return 404 if item does not belong to user', async () => {
      await request(app)
        .patch(`/api/cart/items/${cartItemId}`)
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .send({ quantity: 1 })
        .expect(404);
    });

    it('should return 400 for an invalid quantity (e.g., 0)', async () => {
      await request(app)
        .patch(`/api/cart/items/${cartItemId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ quantity: 0 })
        .expect(400);
    });
  });

  // ========================================================================
  // DELETE /api/cart/items/:itemId
  // ========================================================================
  describe('DELETE /api/cart/items/:itemId', () => {
    let itemToDelete: string;

    beforeAll(async () => {
      // Add a new item specifically for deletion
      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ productId, variationId, quantity: 1 })
        .expect(201);
      itemToDelete = res.body.data.cartItem.id;
    });

    it('should delete the item', async () => {
      await request(app)
        .delete(`/api/cart/items/${itemToDelete}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(204);

      // Verify it's gone
      const cart = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);
      const ids = cart.body.data.items.map((i: any) => i.id);
      expect(ids).not.toContain(itemToDelete);
    });

    it('should return 404 if item not found or not owned', async () => {
      await request(app)
        .delete(`/api/cart/items/${itemToDelete}`)
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .expect(404);
    });
  });

  // ========================================================================
  // POST /api/cart/merge
  // ========================================================================
  describe('POST /api/cart/merge', () => {
    it('should merge guest items into an empty cart', async () => {
      const res = await request(app)
        .post('/api/cart/merge')
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .send({
          items: [{ productId, variationId, quantity: 2 }],
        })
        .expect(200);

      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].quantity).toBe(2);
    });

    it('should return 409 if merged quantity exceeds stock', async () => {
      await request(app)
        .post('/api/cart/merge')
        .set('Authorization', `Bearer ${otherCustomerToken}`)
        .send({
          items: [{ productId, variationId, quantity: 9 }],
        })
        .expect(409);
    });

    it('should return 400 if items array is empty', async () => {
      await request(app)
        .post('/api/cart/merge')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ items: [] })
        .expect(400);
    });
  });

  // ========================================================================
  // POST /api/cart/validate-coupon
  // ========================================================================
  describe('POST /api/cart/validate-coupon', () => {
    it('should return coupon details for a valid code', async () => {
      const res = await request(app)
        .post('/api/cart/validate-coupon')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: 'SAVE10' })
        .expect(200);

      expect(res.body.data.coupon.code).toBe('SAVE10');
      expect(res.body.data.coupon.discountType).toBe('PERCENTAGE');
      expect(res.body.data.coupon.discountValue).toBe(10);
    });

    it('should return 400 for an invalid code', async () => {
      const res = await request(app)
        .post('/api/cart/validate-coupon')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: 'NONEXISTENT' })
        .expect(400);

      expect(res.body.message).toMatch(/Invalid coupon/i);
    });

    it('should return 400 for an expired coupon', async () => {
      await request(app)
        .post('/api/cart/validate-coupon')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: 'EXPIRED20' })
        .expect(400);
    });

    it('should return 400 for a coupon that has reached its usage limit', async () => {
      await request(app)
        .post('/api/cart/validate-coupon')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ code: 'LIMIT1' })
        .expect(400);
    });

    it('should return 401 without token', async () => {
      await request(app).post('/api/cart/validate-coupon').send({ code: 'SAVE10' }).expect(401);
    });
  });
});
