// backend/src/__tests__/api/address.api.test.ts
// API contract tests for address endpoints – CRUD /api/users/me/addresses
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { resetTestDatabase } from '../../test-utils/setup.js';

beforeAll(async () => {
  await resetTestDatabase();
}, 30000);

async function registerAndGetToken(email: string, password: string, name: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password, name })
    .expect(201);
  return res.body.data.tokens.accessToken;
}

describe('Address endpoints', () => {
  let token: string;
  let addressId: string;

  beforeAll(async () => {
    token = await registerAndGetToken('addr-test@test.com', 'AddrPass1!', 'Address User');
  });

  it('should return an empty address list', async () => {
    const res = await request(app)
      .get('/api/users/me/addresses')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.addresses).toEqual([]);
  });

  it('should create a new address', async () => {
    const res = await request(app)
      .post('/api/users/me/addresses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        street: '123 Main St',
        city: 'Test City',
        zipCode: '10001',
        country: 'USA',
        isDefault: true,
      })
      .expect(201);
    expect(res.body.data.address.street).toBe('123 Main St');
    addressId = res.body.data.address.id;
  });

  it('should return the address by ID', async () => {
    const res = await request(app)
      .get(`/api/users/me/addresses/${addressId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.address.id).toBe(addressId);
  });

  it('should update the address', async () => {
    const res = await request(app)
      .put(`/api/users/me/addresses/${addressId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ street: '456 Oak Ave' })
      .expect(200);
    expect(res.body.data.address.street).toBe('456 Oak Ave');
  });

  it('should delete the address', async () => {
    await request(app)
      .delete(`/api/users/me/addresses/${addressId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
  });

  it('should return 401 without a token', async () => {
    await request(app).get('/api/users/me/addresses').expect(401);
  });

  it('should return 400 if required fields are missing', async () => {
    await request(app)
      .post('/api/users/me/addresses')
      .set('Authorization', `Bearer ${token}`)
      .send({ street: 'No city' })
      .expect(400);
  });
});
