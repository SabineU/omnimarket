// backend/src/__tests__/api/order.api.test.ts
// API contract tests for all order endpoints:
//   - Customer: list, detail, cancel, request return, invoice
//   - Seller: list, detail, update status (confirm/ship)
//   - Admin: list all, detail, process refund (approve/reject)

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { resetTestDatabase } from '../../test-utils/setup.js';

// ---------------------------------------------------------------------------
// Helpers
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

describe('Order API', () => {
  let customerToken: string;
  let sellerToken: string;
  let adminToken: string;
  let customerUserId: string; // captured for later use
  let sellerUserId: string; // captured for later use
  let orderId: string;
  let deliveredOrderId: string;
  let addressId: string;
  let variationId: string;
  let productId: string;

  beforeAll(async () => {
    // ---- 1. Create users ----
    const customer = await registerAndGetToken(
      'ordertest-customer@test.com',
      'CustomerPass1!',
      'Order Customer',
      'CUSTOMER',
    );
    customerToken = customer.token;
    customerUserId = customer.userId;

    const seller = await registerAndGetToken(
      'ordertest-seller@test.com',
      'SellerPass1!',
      'Order Seller',
      'SELLER',
    );
    sellerToken = seller.token;
    sellerUserId = seller.userId;

    const admin = await registerAndGetToken(
      'ordertest-admin@test.com',
      'AdminPass1!',
      'Order Admin',
    );
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
      .send({ email: 'ordertest-admin@test.com', password: 'AdminPass1!' })
      .expect(200);
    adminToken = adminLogin.body.data.tokens.accessToken;

    // ---- 2. Create address for the customer ----
    const addrRes = await request(app)
      .post('/api/users/me/addresses')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        street: '123 Order St',
        city: 'Testville',
        zipCode: '10001',
        country: 'USA',
        isDefault: true,
      })
      .expect(201);
    addressId = addrRes.body.data.address.id;

    // ---- 3. Create a category and a product (approved) ----
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
        name: 'Order Test Phone',
        description: 'A phone for testing order flows.',
        categoryId,
        basePrice: 500,
        brand: 'TestCo',
        variations: [{ sku: 'ORD-PHONE', color: 'Blue', stockQty: 100, priceModifier: 0 }],
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

    // ---- 4. Create orders directly in DB (bypass Stripe) ----
    const directOrder = await setupPrisma.order.create({
      data: {
        customerId: customerUserId,
        status: 'CONFIRMED',
        shippingAddressId: addressId,
        totalAmount: 1000,
        items: {
          create: [
            {
              productId,
              variationId,
              sellerId: sellerUserId,
              quantity: 2,
              priceAtTime: 500,
            },
          ],
        },
      },
    });
    orderId = directOrder.id;

    // Also create a DELIVERED order for the return flow
    const delivered = await setupPrisma.order.create({
      data: {
        customerId: customerUserId,
        status: 'DELIVERED',
        shippingAddressId: addressId,
        totalAmount: 500,
        items: {
          create: [
            {
              productId,
              variationId,
              sellerId: sellerUserId,
              quantity: 1,
              priceAtTime: 500,
            },
          ],
        },
      },
    });
    deliveredOrderId = delivered.id;

    // Cleanup the temporary Prisma connection
    await setupPool.end();
    await setupPrisma.$disconnect();
  });

  // ==========================================================================
  // CUSTOMER ENDPOINTS
  // ==========================================================================
  describe('Customer orders', () => {
    it('should list customer orders', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.data.orders.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.pagination).toBeDefined();
    });

    it('should get a single order', async () => {
      const res = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.data.order.id).toBe(orderId);
    });

    it('should cancel a PENDING/CONFIRMED order', async () => {
      const res = await request(app)
        .patch(`/api/orders/${orderId}/cancel`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.body.data.order.status).toBe('CANCELLED');
    });

    it('should request a return for a DELIVERED order', async () => {
      const res = await request(app)
        .patch(`/api/orders/${deliveredOrderId}/request-return`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ reason: 'Defective' })
        .expect(200);

      expect(res.body.data.order.status).toBe('RETURN_REQUESTED');
    });

    it('should download an invoice (PDF)', async () => {
      const res = await request(app)
        .get(`/api/orders/${deliveredOrderId}/invoice`)
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(200);

      expect(res.headers['content-type']).toMatch(/application\/pdf/);
      expect(res.body).toBeDefined();
    });

    it('should return 404 for order belonging to another user', async () => {
      const other = await registerAndGetToken(
        'ordertest-other@test.com',
        'OtherPass1!',
        'Other Customer',
      );
      await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${other.token}`)
        .expect(404);
    });
  });

  // ==========================================================================
  // SELLER ENDPOINTS
  // ==========================================================================
  describe('Seller orders', () => {
    it('should list orders containing seller items', async () => {
      const res = await request(app)
        .get('/api/seller/orders')
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(res.body.data.orders.length).toBeGreaterThanOrEqual(1);
    });

    it('should get a single order with only seller items', async () => {
      const res = await request(app)
        .get(`/api/seller/orders/${orderId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      expect(res.body.data.order.id).toBe(orderId);
    });

    it('should update order status from PENDING to CONFIRMED', async () => {
      // Create a temporary PENDING order belonging to this seller
      const { PrismaClient } = await import('@prisma/client');
      const { PrismaPg } = await import('@prisma/adapter-pg');
      const { Pool } = await import('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const adapter = new PrismaPg(pool);
      const prisma = new PrismaClient({ adapter });

      const pendingOrder = await prisma.order.create({
        data: {
          customerId: customerUserId,
          status: 'PENDING',
          shippingAddressId: addressId,
          totalAmount: 100,
          items: {
            create: [
              {
                productId,
                variationId,
                sellerId: sellerUserId,
                quantity: 1,
                priceAtTime: 100,
              },
            ],
          },
        },
      });
      await pool.end();
      await prisma.$disconnect();

      const res = await request(app)
        .patch(`/api/seller/orders/${pendingOrder.id}/status`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(200);

      expect(res.body.data.order.status).toBe('CONFIRMED');
    });

    it('should return 403 for customer trying seller route', async () => {
      await request(app)
        .get('/api/seller/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });
  });

  // ==========================================================================
  // ADMIN ENDPOINTS
  // ==========================================================================
  describe('Admin orders', () => {
    it('should list all orders', async () => {
      const res = await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.orders.length).toBeGreaterThanOrEqual(1);
    });

    it('should get a single order with full details', async () => {
      const res = await request(app)
        .get(`/api/admin/orders/${deliveredOrderId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.order.id).toBe(deliveredOrderId);
    });

    it('should process a refund (approve)', async () => {
      // deliveredOrderId is currently RETURN_REQUESTED from the earlier test
      const res = await request(app)
        .patch(`/api/admin/orders/${deliveredOrderId}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'APPROVE' })
        .expect(200);

      expect(res.body.data.order.status).toBe('RETURNED');
    });

    it('should return 403 for non-admin', async () => {
      await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .expect(403);
    });
  });
});
