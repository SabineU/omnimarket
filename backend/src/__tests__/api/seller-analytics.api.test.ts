// backend/src/__tests__/api/seller-analytics.api.test.ts
// API contract tests for GET /api/seller/analytics/sales

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

describe('Seller Sales Analytics API', () => {
  let sellerToken: string;
  let customerToken: string;

  beforeAll(async () => {
    const seller = await registerAndGetToken(
      'analytics-seller@test.com',
      'SellerPass1!',
      'Analytics Seller',
      'SELLER',
    );
    sellerToken = seller.token;

    const customer = await registerAndGetToken(
      'analytics-customer@test.com',
      'CustomerPass1!',
      'Analytics Customer',
      'CUSTOMER',
    );
    customerToken = customer.token;
  });

  it('should return 30-day daily sales for default range', async () => {
    const res = await request(app)
      .get('/api/seller/analytics/sales')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    expect(res.body.status).toBe('success');
    const sales = res.body.data.sales;
    expect(Array.isArray(sales)).toBe(true);
    expect(sales.length).toBe(30); // one entry per day
    expect(sales[0]).toHaveProperty('date');
    expect(sales[0]).toHaveProperty('sales');
  });

  it('should accept custom start and end dates', async () => {
    const res = await request(app)
      .get('/api/seller/analytics/sales?start=2026-05-01&end=2026-05-03')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    expect(res.body.data.sales.length).toBeLessThanOrEqual(3);
  });

  it('should return 403 for customer', async () => {
    await request(app)
      .get('/api/seller/analytics/sales')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('should return 401 without token', async () => {
    await request(app).get('/api/seller/analytics/sales').expect(401);
  });
});
