// backend/src/__tests__/api/admin-dashboard.api.test.ts
// API contract tests for GET /api/admin/dashboard/stats

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

describe('Admin Dashboard API', () => {
  let adminToken: string;
  let customerToken: string;

  beforeAll(async () => {
    // Create admin user
    const admin = await registerAndGetToken(
      'dashboard-admin@test.com',
      'AdminPass1!',
      'Dashboard Admin',
    );
    // Promote to ADMIN in DB
    const { PrismaClient } = await import('@prisma/client');
    const { PrismaPg } = await import('@prisma/adapter-pg');
    const { Pool } = await import('pg');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });
    await prisma.user.update({ where: { id: admin.userId }, data: { role: 'ADMIN' } });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dashboard-admin@test.com', password: 'AdminPass1!' })
      .expect(200);
    adminToken = loginRes.body.data.tokens.accessToken;
    await pool.end();
    await prisma.$disconnect();

    // Create a customer for 403 test
    const customer = await registerAndGetToken(
      'dashboard-customer@test.com',
      'CustomerPass1!',
      'Dashboard Customer',
      'CUSTOMER',
    );
    customerToken = customer.token;
  });

  it('should return dashboard stats for admin', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard/stats')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data).toHaveProperty('totalRevenue');
    expect(res.body.data).toHaveProperty('totalOrders');
    expect(res.body.data).toHaveProperty('totalCustomers');
    expect(res.body.data).toHaveProperty('totalSellers');
    expect(res.body.data).toHaveProperty('totalProducts');
    expect(res.body.data).toHaveProperty('recentOrders');
  });

  it('should return 403 for non-admin', async () => {
    await request(app)
      .get('/api/admin/dashboard/stats')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('should return 401 without token', async () => {
    await request(app).get('/api/admin/dashboard/stats').expect(401);
  });
});
