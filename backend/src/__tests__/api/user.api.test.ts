// backend/src/__tests__/api/user.api.test.ts
// API contract tests for user profile endpoints – GET, PUT, DELETE /api/users/me
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import { resetTestDatabase } from '../../test-utils/setup.js';

beforeAll(async () => {
  await resetTestDatabase();
}, 30000); // allow time for Neon cold start

async function registerAndGetToken(email: string, password: string, name: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password, name })
    .expect(201);
  return res.body.data.tokens.accessToken;
}

describe('User profile endpoints', () => {
  let token: string;

  beforeAll(async () => {
    token = await registerAndGetToken('profile-test@test.com', 'ProfilePass1!', 'Profile User');
  });

  it('should return the current user profile', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.user.email).toBe('profile-test@test.com');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('should update the user’s name', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Name' })
      .expect(200);
    expect(res.body.data.user.name).toBe('Updated Name');
  });

  it('should return 400 if name is too short', async () => {
    const res = await request(app)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'A' })
      .expect(400);
    expect(res.body.status).toBe('error');
  });

  it('should anonymise the account', async () => {
    const res = await request(app)
      .delete('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.user.email).toMatch(/deleted-/);
    expect(res.body.data.user.name).toBe('Deleted User');
  });

  it('should still return the anonymised profile with the same token', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.data.user.email).toMatch(/deleted-/);
  });
});
