// backend/src/__tests__/auth.api.test.ts
// API contract tests for authentication endpoints.
// Uses Supertest to send real HTTP requests to the Express app,
// connected to the test database.

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app.js'; // Our Express application
import { resetTestDatabase } from '../../test-utils/setup.js';

// ---------------------------------------------------------------------------
// Before all tests in this file, reset the test database to a clean state.
// This ensures each test run starts with empty tables.
// ---------------------------------------------------------------------------
beforeAll(async () => {
  // Truncate all tables in the test database
  await resetTestDatabase();
  // Note: we do not seed any data – we create users on the fly within tests.
});

// ---------------------------------------------------------------------------
// After all tests, no explicit cleanup is needed; Vitest will exit the process.
// ---------------------------------------------------------------------------
afterAll(async () => {
  // The app uses a Prisma client with a pool; the pool will close when the process exits.
});

// =============================================================================
// POST /api/auth/register
// =============================================================================
describe('POST /api/auth/register', () => {
  it('should register a new user and return 201 with user and tokens', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'newuser@test.com',
        password: 'SecurePass1',
        name: 'Test User',
      })
      .expect('Content-Type', /json/)
      .expect(201);

    // Contract: response body must have these exact shapes
    expect(response.body.status).toBe('success');
    expect(response.body.data).toHaveProperty('user');
    expect(response.body.data).toHaveProperty('tokens');
    expect(response.body.data.tokens).toHaveProperty('accessToken');
    expect(response.body.data.tokens).toHaveProperty('refreshToken');

    // The user object must NOT contain passwordHash
    expect(response.body.data.user).not.toHaveProperty('passwordHash');
    expect(response.body.data.user.email).toBe('newuser@test.com');
    expect(response.body.data.user.role).toBe('CUSTOMER');
  });

  it('should return 400 for invalid email', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'invalid',
        password: 'SecurePass1',
        name: 'Test',
      })
      .expect(400);

    expect(response.body.status).toBe('error');
    expect(response.body.errors).toBeDefined();
  });

  it('should return 409 if email already exists', async () => {
    // First registration (201)
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'duplicate@test.com', password: 'SecurePass1', name: 'Dupe' })
      .expect(201);

    // Second registration with same email → conflict
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'duplicate@test.com', password: 'SecurePass1', name: 'Dupe2' })
      .expect(409);

    expect(response.body.status).toBe('error');
    expect(response.body.message).toMatch(/already exists/i);
  });
});

// =============================================================================
// POST /api/auth/login
// =============================================================================
describe('POST /api/auth/login', () => {
  // Create a user before login tests
  beforeAll(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'login-test@test.com', password: 'LoginPass1', name: 'Login' });
  });

  it('should log in with correct credentials and return 200 with tokens', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login-test@test.com', password: 'LoginPass1' })
      .expect(200);

    expect(response.body.status).toBe('success');
    expect(response.body.data.user.email).toBe('login-test@test.com');
    expect(response.body.data.tokens.accessToken).toBeTruthy();
    expect(response.body.data.tokens.refreshToken).toBeTruthy();
  });

  it('should return 401 for wrong password', async () => {
    // Use a password that passes Zod validation (≥6 chars) but is incorrect
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login-test@test.com', password: 'WrongPass1!' })
      .expect(401);

    expect(response.body.status).toBe('error');
  });

  it('should return 401 for non-existent user', async () => {
    // Use a password that passes Zod validation (≥6 chars)
    // Since the user doesn't exist, we only need to verify the status code
    await request(app)
      .post('/api/auth/login')
      .send({ email: 'noone@test.com', password: 'SomePass1' })
      .expect(401);
  });
});

// =============================================================================
// POST /api/auth/refresh
// =============================================================================
describe('POST /api/auth/refresh', () => {
  let refreshToken: string;

  beforeAll(async () => {
    // Register to get a valid refresh token
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'refresh-test@test.com', password: 'Refresh1', name: 'Refresher' });
    refreshToken = res.body.data.tokens.refreshToken;
  });

  it('should return new tokens when given a valid refresh token', async () => {
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(response.body.data.tokens.accessToken).toBeTruthy();
    expect(response.body.data.tokens.refreshToken).toBeTruthy();
    // The new refresh token should be different from the old one (rotation)
    expect(response.body.data.tokens.refreshToken).not.toBe(refreshToken);
  });

  it('should return 401 when using the same token again (already rotated)', async () => {
    // Using the original token a second time must fail
    const response = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .expect(401);

    expect(response.body.message).toMatch(/revoked|invalid/i);
  });

  it('should return 401 for an invalid token', async () => {
    // An invalid token should be rejected; we only check the status code
    await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'invalid-token' })
      .expect(401);
  });
});

// =============================================================================
// POST /api/auth/forgot-password
// =============================================================================
describe('POST /api/auth/forgot-password', () => {
  beforeAll(async () => {
    // Create a user whose password we can reset
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'forgot@test.com', password: 'Forgot1', name: 'Forgotter' });
  });

  it('should return 200 with a devToken in development', async () => {
    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'forgot@test.com' })
      .expect(200);

    expect(response.body.status).toBe('success');
    // In development and test, the token is returned for testing
    expect(response.body.devToken).toBeTruthy();
  });

  it('should still return 200 for non-existent email (no user enumeration)', async () => {
    const response = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@test.com' })
      .expect(200);

    expect(response.body.status).toBe('success');
    // devToken should not be present as no user exists
    expect(response.body.devToken).toBeUndefined();
  });
});

// =============================================================================
// POST /api/auth/reset-password
// =============================================================================
describe('POST /api/auth/reset-password', () => {
  let resetToken: string;

  beforeAll(async () => {
    // Create user and request a reset token
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'reset-test@test.com', password: 'Reset1', name: 'Resetter' });
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'reset-test@test.com' });
    resetToken = res.body.devToken;
  });

  it('should reset the password and return 200', async () => {
    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: resetToken, newPassword: 'NewPass123!' })
      .expect(200);

    expect(response.body.status).toBe('success');
    expect(response.body.message).toMatch(/reset successfully/i);
  });

  it('should allow the user to log in with the new password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'reset-test@test.com', password: 'NewPass123!' })
      .expect(200);
    expect(response.body.status).toBe('success');
  });

  it('should return 401 if the same token is used again', async () => {
    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: resetToken, newPassword: 'Another1' })
      .expect(401);
    expect(response.body.status).toBe('error');
  });
});
