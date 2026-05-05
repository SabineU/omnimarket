// /* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/api/upload.api.test.ts
// API contract tests for image upload endpoint.
// We test authentication, authorization, and input validation.
// Actual Cloudinary upload is mocked at the unit test level.

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

describe('Image upload endpoint', () => {
  let sellerToken: string;
  let customerToken: string;

  beforeAll(async () => {
    const seller = await registerAndGetToken(
      'seller-upload@test.com',
      'SellerPass1!',
      'Seller Upload',
      'SELLER',
    );
    sellerToken = seller.token;

    const customer = await registerAndGetToken(
      'customer-upload@test.com',
      'CustomerPass1!',
      'Customer Upload',
      'CUSTOMER',
    );
    customerToken = customer.token;
  });

  it('should return 400 when no file is attached', async () => {
    const res = await request(app)
      .post('/api/seller/upload')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(400);

    expect(res.body.message).toMatch(/No image file/i);
  });

  it('should return 403 for a non-seller user', async () => {
    await request(app)
      .post('/api/seller/upload')
      .set('Authorization', `Bearer ${customerToken}`)
      .attach('image', Buffer.from('fake-image'), 'test.jpg') // still 403 before file processed
      .expect(403);
  });

  it('should return 401 without a token', async () => {
    await request(app).post('/api/seller/upload').expect(401);
  });
});
