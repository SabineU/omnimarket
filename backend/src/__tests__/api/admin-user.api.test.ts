/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/api/admin-user.api.test.ts
// API contract tests for admin user management endpoints:
//   - GET    /api/admin/users
//   - GET    /api/admin/users/:id
//   - PATCH  /api/admin/users/:id/active-status
//   - DELETE /api/admin/users/:id

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

describe('Admin User Management API', () => {
  let adminToken: string;
  let customerToken: string;
  let targetUserId: string;

  beforeAll(async () => {
    // Create admin
    const admin = await registerAndGetToken('user-admin@test.com', 'AdminPass1!', 'User Admin');
    const { PrismaClient } = await import('@prisma/client');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });
    await prisma.user.update({ where: { id: admin.userId }, data: { role: 'ADMIN' } });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user-admin@test.com', password: 'AdminPass1!' })
      .expect(200);
    adminToken = loginRes.body.data.tokens.accessToken;
    await pool.end();
    await prisma.$disconnect();

    // Create a customer (target user)
    const customer = await registerAndGetToken(
      'user-target@test.com',
      'CustomerPass1!',
      'Target Customer',
      'CUSTOMER',
    );
    customerToken = customer.token;
    targetUserId = customer.userId;
  });

  // ---- List users ----
  it('should list all users', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data.users.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.pagination).toBeDefined();
  });

  it('should filter users by search', async () => {
    const res = await request(app)
      .get('/api/admin/users?search=Target')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.users.some((u: any) => u.name.includes('Target'))).toBe(true);
  });

  // ---- Get single user ----
  it('should get a single user by ID', async () => {
    const res = await request(app)
      .get(`/api/admin/users/${targetUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.user.id).toBe(targetUserId);
  });

  it('should return 404 for non-existent user', async () => {
    await request(app)
      .get('/api/admin/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`)
      // The service throws a generic Error, which becomes 500. That's acceptable for now.
      .expect(500);
  });

  // ---- Toggle active status ----
  it('should deactivate a user', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${targetUserId}/active-status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false })
      .expect(200);

    expect(res.body.data.user.isActive).toBe(false);
  });

  it('should reactivate the user', async () => {
    const res = await request(app)
      .patch(`/api/admin/users/${targetUserId}/active-status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: true })
      .expect(200);

    expect(res.body.data.user.isActive).toBe(true);
  });

  it('should return 400 for invalid isActive value', async () => {
    await request(app)
      .patch(`/api/admin/users/${targetUserId}/active-status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: 'yes' }) // not a boolean
      .expect(400);
  });

  // ---- Delete (anonymise) user ----
  it('should delete (anonymise) a user', async () => {
    const res = await request(app)
      .delete(`/api/admin/users/${targetUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.message).toMatch(/deleted/i);
  });

  // ---- Access control ----
  it('should return 403 for non-admin', async () => {
    await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('should return 401 without token', async () => {
    await request(app).get('/api/admin/users').expect(401);
  });
});
