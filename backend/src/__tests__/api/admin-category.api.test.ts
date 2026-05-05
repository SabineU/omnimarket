/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/api/admin-category.api.test.ts
// API contract tests for admin category management endpoints.
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

describe('Admin category CRUD', () => {
  let adminToken: string;
  let customerToken: string;
  let categoryId: string;

  beforeAll(async () => {
    // Create an admin user
    const { userId } = await registerAndGetToken(
      'admin-crud@test.com',
      'AdminPass1!',
      'Admin CRUD',
    );
    // Promote to ADMIN
    const { PrismaClient } = await import('@prisma/client');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });
    await prisma.user.update({ where: { id: userId }, data: { role: 'ADMIN' } });
    await pool.end();
    await prisma.$disconnect();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin-crud@test.com', password: 'AdminPass1!' })
      .expect(200);
    adminToken = loginRes.body.data.tokens.accessToken;

    // Create a regular customer user (to test forbidden)
    const { token: cToken } = await registerAndGetToken(
      'customer-crud@test.com',
      'CustomerPass1!',
      'Customer CRUD',
      'CUSTOMER',
    );
    customerToken = cToken;
  });

  // ---- POST /api/admin/categories ----
  it('should create a top-level category', async () => {
    const res = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Books', slug: 'books' })
      .expect(201);

    expect(res.body.data.category.name).toBe('Books');
    expect(res.body.data.category.slug).toBe('books');
    expect(res.body.data.category.parentId).toBeNull();
    categoryId = res.body.data.category.id;
  });

  it('should create a child category', async () => {
    const res = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Fiction', slug: 'fiction', parentId: categoryId })
      .expect(201);

    expect(res.body.data.category.parentId).toBe(categoryId);
  });

  it('should return 400 if required fields are missing', async () => {
    await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Missing slug' })
      .expect(400);
  });

  // ---- PUT /api/admin/categories/:id ----
  it('should update an existing category', async () => {
    const res = await request(app)
      .put(`/api/admin/categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Updated Books' })
      .expect(200);

    expect(res.body.data.category.name).toBe('Updated Books');
  });

  it('should return 404 when updating a non-existent category', async () => {
    await request(app)
      .put('/api/admin/categories/nonexistent-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Ghost' })
      .expect(404);
  });

  // ---- DELETE /api/admin/categories/:id ----
  it('should delete a category and its children become top-level', async () => {
    // Delete the parent category (Books)
    await request(app)
      .delete(`/api/admin/categories/${categoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(204);

    // Verify that the child category (Fiction) now has parentId null
    const treeRes = await request(app).get('/api/categories').expect(200);

    // Find Fiction in the tree – it should be top-level now
    const fiction = treeRes.body.data.categories.find((c: any) => c.slug === 'fiction');
    expect(fiction).toBeDefined();
    expect(fiction.parentId).toBeNull();
  });

  // ---- Access control ----
  it('should return 403 for a non-admin user', async () => {
    await request(app)
      .post('/api/admin/categories')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ name: 'Hack', slug: 'hack' })
      .expect(403);
  });

  it('should return 401 without a token', async () => {
    await request(app).post('/api/admin/categories').send({ name: 'No', slug: 'no' }).expect(401);
  });
});
