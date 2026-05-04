// backend/src/__tests__/api/seller.api.test.ts
// API contract tests for seller profile endpoints – GET/PUT /api/seller/profile
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
  role?: 'CUSTOMER' | 'SELLER',
): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password, name, role })
    .expect(201);
  return res.body.data.tokens.accessToken;
}

describe('Seller profile endpoints', () => {
  let sellerToken: string;
  let customerToken: string;

  beforeAll(async () => {
    sellerToken = await registerAndGetToken(
      'seller-test@test.com',
      'SellerPass1!',
      'Seller User',
      'SELLER',
    );
    customerToken = await registerAndGetToken(
      'customer-test@test.com',
      'CustomerPass1!',
      'Customer User',
      'CUSTOMER',
    );
  });

  it('should return null before profile is created', async () => {
    const res = await request(app)
      .get('/api/seller/profile')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    expect(res.body.data.profile).toBeNull();
  });

  it('should create a seller profile', async () => {
    const res = await request(app)
      .put('/api/seller/profile')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ storeName: 'My Store', description: 'Best products' })
      .expect(200);
    expect(res.body.data.profile.storeName).toBe('My Store');
    expect(res.body.data.profile.isApproved).toBe(false);
  });

  it('should return the created profile', async () => {
    const res = await request(app)
      .get('/api/seller/profile')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);
    expect(res.body.data.profile.storeName).toBe('My Store');
  });

  it('should return 403 when accessed by a non-seller', async () => {
    await request(app)
      .get('/api/seller/profile')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('should return 401 without a token', async () => {
    await request(app).get('/api/seller/profile').expect(401);
  });
});
