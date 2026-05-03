/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/auth.service.test.ts
// Unit tests for the authentication service.
// We mock Prisma and bcrypt so that the tests run in isolation and don't
// require a database connection.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Import the functions we want to test
import {
  registerUser,
  loginUser,
  refreshUserToken,
  requestPasswordReset,
  resetPassword,
  sanitizeUser,
  UserExistsError,
  InvalidCredentialsError,
  TokenRefreshError,
  TokenInvalidError,
} from '../services/auth.service.js';

// ---------------------------------------------------------------------------
// Mock the database module so we can control what prisma returns
// ---------------------------------------------------------------------------
vi.mock('../db.js', () => {
  // We'll create a fake prisma client with methods we can control per test
  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    passwordResetToken: {
      deleteMany: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
  };

  return { prisma: mockPrisma };
});

// Import the mocked prisma so we can change its behaviour in each test
import { prisma } from '../db.js';

// ---------------------------------------------------------------------------
// Mock bcrypt so we don't actually hash passwords (slow and unnecessary)
// ---------------------------------------------------------------------------
vi.mock('bcrypt', () => {
  return {
    default: {
      // When hashing, just return a fake hash string
      hash: vi.fn().mockResolvedValue('$2b$12$fakehashedpassword'),
      // Compare will be controlled per test via mockImplementation
      compare: vi.fn(),
    },
  };
});

import bcrypt from 'bcrypt';

// ---------------------------------------------------------------------------
// Mock the JWT utility so we don't sign real tokens
// ---------------------------------------------------------------------------
vi.mock('../utils/jwt.js', () => {
  return {
    generateAccessToken: vi.fn().mockReturnValue('mock-access-token'),
    generateRefreshToken: vi.fn().mockReturnValue('mock-refresh-token'),
    verifyRefreshToken: vi.fn(),
  };
});

import { verifyRefreshToken } from '../utils/jwt.js';

// ---------------------------------------------------------------------------
// Reset all mocks before each test so no state leaks between tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// sanitizeUser
// =============================================================================
describe('sanitizeUser', () => {
  it('should remove the passwordHash field from the user object', () => {
    // Create a fake user that looks like a Prisma User
    const user = {
      id: '123',
      email: 'test@example.com',
      passwordHash: 'secret',
      name: 'Test',
      role: 'CUSTOMER' as const,
      avatarUrl: null,
      tokenVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const safe = sanitizeUser(user);

    // The result must NOT contain passwordHash
    expect(safe).not.toHaveProperty('passwordHash');
    // But all other fields remain
    expect(safe.email).toBe('test@example.com');
  });
});

// =============================================================================
// registerUser
// =============================================================================
describe('registerUser', () => {
  it('should create a new user and return tokens', async () => {
    // Arrange: simulate that no user with this email exists
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    // Mock the create call to return a fake user
    const fakeUser = {
      id: 'new-id',
      email: 'new@example.com',
      passwordHash: '$2b$12$fakehashedpassword',
      name: 'New User',
      role: 'CUSTOMER' as const,
      avatarUrl: null,
      tokenVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(prisma.user.create).mockResolvedValue(fakeUser as any);

    // Act: call the function under test
    const result = await registerUser({
      email: 'new@example.com',
      password: 'Password123!',
      name: 'New User',
    });

    // Assert: we should get back sanitized user + tokens
    expect(result.user.email).toBe('new@example.com');
    expect(result.accessToken).toBe('mock-access-token');
    expect(result.refreshToken).toBe('mock-refresh-token');
    // Ensure bcrypt was called to hash the password
    expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 12);
  });

  it('should throw UserExistsError if email already taken', async () => {
    // Arrange: simulate an existing user
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'existing' } as any);

    // Act & Assert: the promise should reject with UserExistsError
    await expect(
      registerUser({
        email: 'existing@example.com',
        password: 'Password123!',
        name: 'Existing',
      }),
    ).rejects.toThrow(UserExistsError);
  });
});

// =============================================================================
// loginUser
// =============================================================================
describe('loginUser', () => {
  it('should return tokens when password is correct', async () => {
    // Arrange: user exists
    const fakeUser = {
      id: 'u1',
      email: 'login@example.com',
      passwordHash: '$2b$12$fakehashedpassword',
      name: 'Login',
      role: 'CUSTOMER' as const,
      avatarUrl: null,
      tokenVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(prisma.user.findUnique).mockResolvedValue(fakeUser as any);
    // Mock bcrypt.compare to return true (password matches)
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    // Act
    const result = await loginUser({
      email: 'login@example.com',
      password: 'Password123!',
    });

    // Assert
    expect(result.accessToken).toBe('mock-access-token');
    expect(result.refreshToken).toBe('mock-refresh-token');
    expect(result.user.email).toBe('login@example.com');
    // Verify bcrypt.compare was called with the plain password and hash
    expect(bcrypt.compare).toHaveBeenCalledWith('Password123!', '$2b$12$fakehashedpassword');
  });

  it('should throw InvalidCredentialsError if password is wrong', async () => {
    // Arrange
    vi.mocked(prisma.user.findUnique).mockResolvedValue({} as any);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    // Act & Assert
    await expect(loginUser({ email: 'x@x.com', password: 'wrong' })).rejects.toThrow(
      InvalidCredentialsError,
    );
  });

  it('should throw InvalidCredentialsError if user not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(loginUser({ email: 'unknown@x.com', password: 'any' })).rejects.toThrow(
      InvalidCredentialsError,
    );
  });
});

// =============================================================================
// refreshUserToken
// =============================================================================
describe('refreshUserToken', () => {
  it('should rotate tokens successfully', async () => {
    // Arrange: refresh token is valid and user exists with matching version
    vi.mocked(verifyRefreshToken).mockReturnValue({
      userId: 'u1',
      tokenVersion: 3,
    });
    const fakeUser = {
      id: 'u1',
      tokenVersion: 3,
      // other fields aren't needed for this logic except in sanitizeUser
      email: 'u@u.com',
      passwordHash: 'hash',
      name: 'U',
      role: 'CUSTOMER' as const,
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(prisma.user.findUnique).mockResolvedValue(fakeUser as any);
    // After rotation, tokenVersion becomes 4
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...fakeUser,
      tokenVersion: 4,
    } as any);

    // Act
    const result = await refreshUserToken('old-refresh-token');

    // Assert
    expect(result.accessToken).toBe('mock-access-token');
    expect(result.refreshToken).toBe('mock-refresh-token');
    // The user's tokenVersion should be incremented by Prisma
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { tokenVersion: { increment: 1 } },
    });
  });

  it('should throw TokenRefreshError if version mismatch', async () => {
    // Arrange: version in token doesn't match user's current version
    vi.mocked(verifyRefreshToken).mockReturnValue({
      userId: 'u1',
      tokenVersion: 2,
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      tokenVersion: 5, // user has already rotated past version 2
    } as any);

    await expect(refreshUserToken('old')).rejects.toThrow(TokenRefreshError);
  });
});

// =============================================================================
// requestPasswordReset
// =============================================================================
describe('requestPasswordReset', () => {
  it('should return null if email not found (silent)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    const token = await requestPasswordReset('no@no.com');
    expect(token).toBeNull();
  });

  it('should return a plain token if user exists', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
    } as any);
    // deleteMany and create do not return values we use, just succeed
    vi.mocked(prisma.passwordResetToken.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.passwordResetToken.create).mockResolvedValue({} as any);

    const token = await requestPasswordReset('ok@ok.com');
    expect(token).toBeTruthy();
    // bcrypt.hash should have been called
    expect(bcrypt.hash).toHaveBeenCalled();
  });
});

// =============================================================================
// resetPassword
// =============================================================================
describe('resetPassword', () => {
  it('should throw TokenInvalidError if token not found', async () => {
    vi.mocked(prisma.passwordResetToken.findMany).mockResolvedValue([]);

    await expect(resetPassword('invalid', 'NewPass123!')).rejects.toThrow(TokenInvalidError);
  });

  it('should update password and delete token when token matches', async () => {
    // Arrange: there is an active token whose hash matches
    const matchedToken = {
      id: 'rt1',
      userId: 'u1',
      tokenHash: 'hashed',
      expiresAt: new Date(Date.now() + 10000),
    } as any;
    vi.mocked(prisma.passwordResetToken.findMany).mockResolvedValue([matchedToken]);
    // bcrypt.compare should return true when comparing the plain token to the stored hash
    const bcryptCompareMock = vi.mocked(bcrypt.compare);
    bcryptCompareMock.mockResolvedValueOnce(true as never); // for the loop
    // user.update
    vi.mocked(prisma.user.update).mockResolvedValue({} as any);
    vi.mocked(prisma.passwordResetToken.delete).mockResolvedValue({} as any);

    await expect(resetPassword('valid-token', 'NewPass456!')).resolves.toBeUndefined();

    // The password should have been hashed and user updated
    expect(bcrypt.hash).toHaveBeenCalledWith('NewPass456!', 12);
    expect(prisma.user.update).toHaveBeenCalled();
    // The used token should be deleted
    expect(prisma.passwordResetToken.delete).toHaveBeenCalledWith({
      where: { id: 'rt1' },
    });
  });
});
