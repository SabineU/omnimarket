// /* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/api/product-public.api.test.ts
// API contract tests for public product listing and detail endpoints.

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

describe('Public product endpoints', () => {
  let productSlug: string;
  let productId: string;

  beforeAll(async () => {
    // 1. Create a seller and a category, then a product
    const seller = await registerAndGetToken(
      'seller-pub@test.com',
      'SellerPass1!',
      'Seller Pub',
      'SELLER',
    );
    const sellerToken = seller.token;

    // Create admin for category
    const { userId: adminId } = await registerAndGetToken(
      'admin-pub@test.com',
      'AdminPass1!',
      'Admin Pub',
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
      .send({ email: 'admin-pub@test.com', password: 'AdminPass1!' })
      .expect(200);
    const adminToken = loginRes.body.data.tokens.accessToken;

    const catRes = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Electronics', slug: 'electronics' })
      .expect(201);
    const categoryId = catRes.body.data.category.id;

    // Create a product with status ACTIVE (so it appears in listing)
    const productRes = await request(app)
      .post('/api/seller/products')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        name: 'Smartphone',
        description: 'A smart phone with great features.',
        categoryId,
        basePrice: 699.99,
        brand: 'TechCo',
        variations: [{ sku: 'SP1', color: 'Black', stockQty: 10 }],
        images: [{ url: 'http://example.com/phone.jpg', altText: 'Phone' }],
      })
      .expect(201);
    productId = productRes.body.data.product.id;
    productSlug = productRes.body.data.product.slug;

    // Admin must approve the product to make it ACTIVE
    await request(app)
      .patch(`/api/admin/products/${productId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' })
      .expect(200);
  });

  // ---------- GET /api/products ----------
  it('should list active products', async () => {
    const res = await request(app).get('/api/products').expect(200);

    expect(res.body.data.products).toHaveLength(1);
    expect(res.body.data.products[0].slug).toBe(productSlug);
    expect(res.body.data.pagination.totalItems).toBe(1);
  });

  it('should support search query', async () => {
    const res = await request(app).get('/api/products?search=Smartphone').expect(200);

    expect(res.body.data.products.length).toBeGreaterThan(0);
  });

  it('should return empty for non-matching search', async () => {
    const res = await request(app).get('/api/products?search=NonExistingProduct').expect(200);

    expect(res.body.data.products).toHaveLength(0);
  });

  it('should filter by category slug', async () => {
    const res = await request(app).get('/api/products?category=electronics').expect(200);

    expect(res.body.data.products.length).toBeGreaterThan(0);
  });

  it('should filter by price range', async () => {
    const res = await request(app).get('/api/products?minPrice=500&maxPrice=800').expect(200);

    expect(res.body.data.products.length).toBe(1);
  });

  it('should support pagination', async () => {
    const res = await request(app).get('/api/products?page=1&limit=1').expect(200);

    expect(res.body.data.pagination.currentPage).toBe(1);
    expect(res.body.data.pagination.limit).toBe(1);
  });

  // ---------- GET /api/products/:slug ----------
  it('should return a product by slug', async () => {
    const res = await request(app).get(`/api/products/${productSlug}`).expect(200);

    expect(res.body.data.product.name).toBe('Smartphone');
    expect(res.body.data.product.images).toHaveLength(1);
    expect(res.body.data.product.variations).toHaveLength(1);
  });

  it('should return 404 for non-existent slug', async () => {
    await request(app).get('/api/products/nonexistent-slug').expect(404);
  });

  // Public endpoints should work without auth
  it('should allow access without a token', async () => {
    await request(app).get('/api/products').expect(200);
  });
});
