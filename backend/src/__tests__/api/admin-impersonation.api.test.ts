// backend/src/__tests__/api/admin-impersonation.api.test.ts
// API contract tests for admin impersonation:
//   - POST /api/admin/impersonate

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

describe('Admin Impersonation API', () => {
  let adminToken: string;
  let customerToken: string;
  let targetUserId: string;

  beforeAll(async () => {
    // Create admin
    const admin = await registerAndGetToken(
      'imp-admin@test.com',
      'AdminPass1!',
      'Impersonation Admin',
    );
    const { PrismaClient } = await import('@prisma/client');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });
    await prisma.user.update({ where: { id: admin.userId }, data: { role: 'ADMIN' } });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'imp-admin@test.com', password: 'AdminPass1!' })
      .expect(200);
    adminToken = loginRes.body.data.tokens.accessToken;

    // Create a customer (target user)
    const customer = await registerAndGetToken(
      'imp-target@test.com',
      'CustomerPass1!',
      'Impersonation Target',
      'CUSTOMER',
    );
    customerToken = customer.token;
    targetUserId = customer.userId;

    await pool.end();
    await prisma.$disconnect();
  });

  it('should generate an impersonation token for a target user', async () => {
    const res = await request(app)
      .post('/api/admin/impersonate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: targetUserId })
      .expect(201);

    expect(res.body.status).toBe('success');
    expect(res.body.data.token).toBeDefined();
    expect(typeof res.body.data.token).toBe('string');
  });

  it('should return 400 if target user does not exist', async () => {
    await request(app)
      .post('/api/admin/impersonate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: '00000000-0000-0000-0000-000000000000' })
      .expect(400);
  });

  it('should return 400 if target user is deactivated', async () => {
    // Deactivate the target user first
    await request(app)
      .patch(`/api/admin/users/${targetUserId}/active-status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false })
      .expect(200);

    const res = await request(app)
      .post('/api/admin/impersonate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ userId: targetUserId })
      .expect(400);

    expect(res.body.message).toMatch(/deactivated/i);
  });

  it('should return 403 for non-admin', async () => {
    await request(app)
      .post('/api/admin/impersonate')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ userId: targetUserId })
      .expect(403);
  });

  it('should return 401 without token', async () => {
    await request(app).post('/api/admin/impersonate').send({ userId: targetUserId }).expect(401);
  });
});
