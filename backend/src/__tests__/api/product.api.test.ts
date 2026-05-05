// backend/src/__tests__/api/product.api.test.ts
// API contract tests for seller product CRUD endpoints.
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { resetTestDatabase } from '../../test-utils/setup.js';

beforeAll(async () => {
  await resetTestDatabase();
}, 30000);

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

describe('Seller product CRUD', () => {
  let sellerToken: string;
  let customerToken: string;
  let categoryId: string;
  let productId: string;

  beforeAll(async () => {
    // Create a seller user
    const { token: sToken } = await registerAndGetToken(
      'seller-prod@test.com',
      'SellerPass1!',
      'Seller Product',
      'SELLER',
    );
    sellerToken = sToken;

    // Create a customer user (to test forbidden)
    const { token: cToken } = await registerAndGetToken(
      'customer-prod@test.com',
      'CustomerPass1!',
      'Customer Product',
      'CUSTOMER',
    );
    customerToken = cToken;

    // We need a category to assign to the product. Promote a user to admin and create one.
    const { userId: adminId } = await registerAndGetToken(
      'admin-prod@test.com',
      'AdminPass1!',
      'Admin Prod',
    );
    const { PrismaClient } = await import('@prisma/client');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });
    await prisma.user.update({ where: { id: adminId }, data: { role: 'ADMIN' } });
    await pool.end();
    await prisma.$disconnect();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin-prod@test.com', password: 'AdminPass1!' })
      .expect(200);
    const adminToken = loginRes.body.data.tokens.accessToken;

    const catRes = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Electronics', slug: 'electronics' })
      .expect(201);
    categoryId = catRes.body.data.category.id;
  });

  // ---- POST /api/seller/products ----
  it('should create a product with variations and images', async () => {
    const res = await request(app)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Smartphone',
        description: 'A really smart phone with advanced features.',
        categoryId,
        basePrice: 699.99,
        brand: 'TechCo',
        variations: [
          { sku: 'SP-BLK', color: 'Black', stockQty: 100, priceModifier: 0 },
          { sku: 'SP-WHT', color: 'White', stockQty: 50, priceModifier: 10 },
        ],
        images: [
          { url: 'http://example.com/img1.jpg', altText: 'Front view', sortOrder: 0 },
          { url: 'http://example.com/img2.jpg', altText: 'Back view', sortOrder: 1 },
        ],
      })
      .expect(201);

    expect(res.body.data.product.name).toBe('Smartphone');
    expect(res.body.data.product.variations).toHaveLength(2);
    expect(res.body.data.product.images).toHaveLength(2);
    productId = res.body.data.product.id;
  });

  it('should return 400 if required fields are missing', async () => {
    await request(app)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ name: 'Missing description' })
      .expect(400);
  });

  // ---- GET /api/seller/products ----
  it("should list the seller's products", async () => {
    const res = await request(app)
      .get('/api/seller/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    expect(res.body.data.products).toHaveLength(1);
    expect(res.body.data.products[0].name).toBe('Smartphone');
  });

  // ---- GET /api/seller/products/:id ----
  it('should get a single product by ID', async () => {
    const res = await request(app)
      .get(`/api/seller/products/${productId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    expect(res.body.data.product.id).toBe(productId);
    expect(res.body.data.product.variations).toBeDefined();
    expect(res.body.data.product.images).toBeDefined();
  });

  it('should return 404 if product belongs to another seller', async () => {
    // Create another seller and try to access the existing product
    const { token: otherToken } = await registerAndGetToken(
      'other-seller@test.com',
      'OtherPass1!',
      'Other Seller',
      'SELLER',
    );
    await request(app)
      .get(`/api/seller/products/${productId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
  });

  // ---- PUT /api/seller/products/:id ----
  it('should update the product (replace variations/images)', async () => {
    const res = await request(app)
      .put(`/api/seller/products/${productId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Updated Smartphone',
        basePrice: 749.99,
        variations: [{ sku: 'SP-GLD', color: 'Gold', stockQty: 5, priceModifier: 50 }],
        images: [{ url: 'http://example.com/newimg.jpg', altText: 'Updated view' }],
      })
      .expect(200);

    expect(res.body.data.product.name).toBe('Updated Smartphone');
    expect(res.body.data.product.variations).toHaveLength(1);
    expect(res.body.data.product.variations[0].sku).toBe('SP-GLD');
    expect(res.body.data.product.images).toHaveLength(1);
  });

  // ---- DELETE /api/seller/products/:id ----
  it('should delete the product', async () => {
    await request(app)
      .delete(`/api/seller/products/${productId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(204);

    // Verify it's gone
    await request(app)
      .get(`/api/seller/products/${productId}`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(404);
  });

  // ---- Access control ----
  it('should return 403 for a non-seller user', async () => {
    await request(app)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name: 'Hack', description: '...', categoryId, basePrice: 10 })
      .expect(403);
  });

  it('should return 401 without a token', async () => {
    await request(app).get('/api/seller/products').expect(401);
  });
});
