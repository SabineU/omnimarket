// backend/src/__tests__/api/admin-settings.api.test.ts
// API contract tests for system settings:
//   - GET  /api/admin/settings
//   - PUT  /api/admin/settings

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

describe('Admin Settings API', () => {
  let adminToken: string;
  let customerToken: string;

  beforeAll(async () => {
    const admin = await registerAndGetToken(
      'settings-admin@test.com',
      'AdminPass1!',
      'Settings Admin',
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
      .send({ email: 'settings-admin@test.com', password: 'AdminPass1!' })
      .expect(200);
    adminToken = loginRes.body.data.tokens.accessToken;
    await pool.end();
    await prisma.$disconnect();

    const customer = await registerAndGetToken(
      'settings-customer@test.com',
      'CustomerPass1!',
      'Settings Customer',
      'CUSTOMER',
    );
    customerToken = customer.token;
  });

  it('should return empty settings initially', async () => {
    const res = await request(app)
      .get('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toEqual({});
  });

  it('should upsert a setting', async () => {
    const res = await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ key: 'taxRate', value: '5' })
      .expect(200);

    expect(res.body.data.key).toBe('taxRate');
    expect(res.body.data.value).toBe('5');
  });

  it('should return all updated settings', async () => {
    const res = await request(app)
      .get('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data).toHaveProperty('taxRate');
    expect(res.body.data.taxRate).toBe('5');
  });

  it('should update an existing setting', async () => {
    await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ key: 'taxRate', value: '7' })
      .expect(200);

    const res = await request(app)
      .get('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.data.taxRate).toBe('7');
  });

  it('should return 400 for missing key', async () => {
    await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ value: '10' })
      .expect(400);
  });

  it('should return 403 for non-admin', async () => {
    await request(app)
      .put('/api/admin/settings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ key: 'taxRate', value: '5' })
      .expect(403);
  });

  it('should return 401 without token', async () => {
    await request(app).get('/api/admin/settings').expect(401);
  });
});
