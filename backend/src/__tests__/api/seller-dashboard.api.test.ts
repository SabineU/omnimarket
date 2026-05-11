// backend/src/__tests__/api/seller-dashboard.api.test.ts
// API contract tests for GET /api/seller/dashboard

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

describe('Seller Dashboard API', () => {
  let sellerToken: string;
  let customerToken: string;

  beforeAll(async () => {
    // Create a seller user (needed to access the dashboard)
    const seller = await registerAndGetToken(
      'dash-seller@test.com',
      'SellerPass1!',
      'Dash Seller',
      'SELLER',
    );
    sellerToken = seller.token;

    // Create a customer user (to test 403)
    const customer = await registerAndGetToken(
      'dash-customer@test.com',
      'CustomerPass1!',
      'Dash Customer',
      'CUSTOMER',
    );
    customerToken = customer.token;
  });

  it('should return dashboard summary for a seller', async () => {
    const res = await request(app)
      .get('/api/seller/dashboard')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data).toHaveProperty('todaySales');
    expect(res.body.data).toHaveProperty('pendingOrders');
    expect(res.body.data).toHaveProperty('totalProducts');
    expect(res.body.data).toHaveProperty('totalReviews');
    expect(res.body.data).toHaveProperty('averageRating');
  });

  it('should return 403 for a customer', async () => {
    await request(app)
      .get('/api/seller/dashboard')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('should return 401 without token', async () => {
    await request(app).get('/api/seller/dashboard').expect(401);
  });
});
