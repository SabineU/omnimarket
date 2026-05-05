/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/api/category-public.api.test.ts
// API contract tests for public category endpoints (tree and single).
// These endpoints require no authentication.

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { resetTestDatabase } from '../../test-utils/setup.js';

// Helper to register a user and get a token (for admin setup)
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
// Reset the test database once before all tests
// ---------------------------------------------------------------------------
beforeAll(async () => {
  await resetTestDatabase();
}, 30000);

describe('Public category endpoints', () => {
  let adminToken: string;

  beforeAll(async () => {
    // 1. Create an admin user (to create test categories)
    const { userId } = await registerAndGetToken('admin-cat@test.com', 'AdminPass1!', 'Admin Cat');

    // Promote to ADMIN directly in the DB
    const { PrismaClient } = await import('@prisma/client');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });
    await prisma.user.update({ where: { id: userId }, data: { role: 'ADMIN' } });
    await pool.end();
    await prisma.$disconnect();

    // Login as admin
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin-cat@test.com', password: 'AdminPass1!' })
      .expect(200);
    adminToken = loginRes.body.data.tokens.accessToken;

    // 2. Create categories: Electronics (top-level) and Laptops (child of Electronics)
    await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Electronics', slug: 'electronics' })
      .expect(201);

    // Fetch Electronics ID to create a child
    const treeRes = await request(app).get('/api/categories').expect(200);
    const electronics = treeRes.body.data.categories.find((c: any) => c.slug === 'electronics');

    await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Laptops', slug: 'laptops', parentId: electronics.id })
      .expect(201);
  });

  // -------------------------------------------------------------------------
  // GET /api/categories – full tree
  // -------------------------------------------------------------------------
  it('should return the full category tree', async () => {
    const res = await request(app).get('/api/categories').expect(200);

    expect(res.body.status).toBe('success');
    expect(Array.isArray(res.body.data.categories)).toBe(true);
    // At least one top-level category (Electronics) should exist
    expect(res.body.data.categories.length).toBeGreaterThan(0);
    const electronics = res.body.data.categories.find((c: any) => c.slug === 'electronics');
    expect(electronics).toBeDefined();
    // It should have at least one child (Laptops)
    expect(electronics.children).toBeDefined();
    expect(electronics.children.length).toBeGreaterThan(0);
  });

  // -------------------------------------------------------------------------
  // GET /api/categories/:slug – single category
  // -------------------------------------------------------------------------
  it('should return a category by slug with its children', async () => {
    const res = await request(app).get('/api/categories/electronics').expect(200);

    expect(res.body.data.category.slug).toBe('electronics');
    expect(res.body.data.category.children).toBeDefined();
    expect(res.body.data.category.children.length).toBeGreaterThan(0);
  });

  it('should return a leaf category with empty children', async () => {
    const res = await request(app).get('/api/categories/laptops').expect(200);

    expect(res.body.data.category.slug).toBe('laptops');
    expect(res.body.data.category.children).toEqual([]);
  });

  it('should return 404 for a non-existent slug', async () => {
    const res = await request(app).get('/api/categories/nonexistent').expect(404);
    expect(res.body.message).toBeDefined();
  });

  // Public endpoints should work without any authentication
  it('should allow access without a token', async () => {
    await request(app).get('/api/categories').expect(200);
  });
});
