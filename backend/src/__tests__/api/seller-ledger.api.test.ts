// backend/src/__tests__/api/seller-ledger.api.test.ts
// API contract tests for:
//   - GET /api/seller/ledger
//   - GET /api/seller/ledger/export/csv

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

describe('Seller Ledger API', () => {
  let sellerToken: string;
  let customerToken: string;

  beforeAll(async () => {
    const seller = await registerAndGetToken(
      'ledger-seller@test.com',
      'SellerPass1!',
      'Ledger Seller',
      'SELLER',
    );
    sellerToken = seller.token;

    const customer = await registerAndGetToken(
      'ledger-customer@test.com',
      'CustomerPass1!',
      'Ledger Customer',
      'CUSTOMER',
    );
    customerToken = customer.token;
  });

  // ---- JSON endpoint ----
  it('should return ledger summary and transactions', async () => {
    const res = await request(app)
      .get('/api/seller/ledger')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    expect(res.body.status).toBe('success');
    expect(res.body.data).toHaveProperty('totalEarned');
    expect(res.body.data).toHaveProperty('commissionRate');
    expect(res.body.data).toHaveProperty('netEarnings');
    expect(res.body.data).toHaveProperty('transactions');
  });

  // ---- CSV export ----
  it('should return a CSV file with correct header', async () => {
    const res = await request(app)
      .get('/api/seller/ledger/export/csv')
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(200);

    expect(res.headers['content-type']).toMatch(/text\/csv/);
    const body = res.text;
    expect(body).toContain('Order ID,Product,Quantity,Unit Price,Total,Status,Date');
    // If there are no transactions, body is just the header (one line)
    // That's valid.
  });

  it('should return 403 for customer', async () => {
    await request(app)
      .get('/api/seller/ledger')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(403);
  });

  it('should return 401 without token', async () => {
    await request(app).get('/api/seller/ledger').expect(401);
  });
});
