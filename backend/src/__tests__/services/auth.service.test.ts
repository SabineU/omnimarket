/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/auth.service.test.ts
// Unit tests for the authentication service.
// All relative imports go two levels up because we are inside __tests__/services/.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the JWT utility module FIRST, using a static relative path from the
// test file.  Vitest will hoist this mock and resolve it correctly.
// ---------------------------------------------------------------------------
vi.mock('../../utils/jwt.js', () => {
  const mockGenerateAccessToken = vi.fn().mockReturnValue('mock-access-token');
  const mockGenerateRefreshToken = vi.fn().mockReturnValue('mock-refresh-token');
  const mockVerifyRefreshToken = vi.fn();

  return {
    generateAccessToken: mockGenerateAccessToken,
    generateRefreshToken: mockGenerateRefreshToken,
    verifyAccessToken: vi.fn(),
    verifyRefreshToken: mockVerifyRefreshToken,
  };
});

// ---------------------------------------------------------------------------
// Mock the database module
// ---------------------------------------------------------------------------
vi.mock('../../db.js', () => {
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

// ---------------------------------------------------------------------------
// Mock bcrypt
// ---------------------------------------------------------------------------
vi.mock('bcrypt', () => {
  return {
    default: {
      hash: vi.fn().mockResolvedValue('$2b$12$fakehashedpassword'),
      compare: vi.fn(),
    },
  };
});

// ---------------------------------------------------------------------------
// Import everything AFTER all mocks are registered
// ---------------------------------------------------------------------------
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
} from '../../services/auth.service.js';

import { prisma } from '../../db.js';
import bcrypt from 'bcrypt';
import { verifyRefreshToken } from '../../utils/jwt.js';

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// sanitizeUser
// =============================================================================
describe('sanitizeUser', () => {
  it('should remove the passwordHash field from the user object', () => {
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
    expect(safe).not.toHaveProperty('passwordHash');
    expect(safe.email).toBe('test@example.com');
  });
});

// =============================================================================
// registerUser
// =============================================================================
describe('registerUser', () => {
  it('should create a new user and return tokens', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
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

    const result = await registerUser({
      email: 'new@example.com',
      password: 'Password123!',
      name: 'New User',
    });

    expect(result.user.email).toBe('new@example.com');
    expect(result.accessToken).toBe('mock-access-token');
    expect(result.refreshToken).toBe('mock-refresh-token');
    expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 12);
  });

  it('should throw UserExistsError if email already taken', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'existing' } as any);
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
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await loginUser({ email: 'login@example.com', password: 'Password123!' });

    expect(result.accessToken).toBe('mock-access-token');
    expect(result.refreshToken).toBe('mock-refresh-token');
    expect(result.user.email).toBe('login@example.com');
    expect(bcrypt.compare).toHaveBeenCalledWith('Password123!', '$2b$12$fakehashedpassword');
  });

  it('should throw InvalidCredentialsError if password is wrong', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({} as any);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
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
    const mockedVerifyRefreshToken = vi.mocked(verifyRefreshToken);
    mockedVerifyRefreshToken.mockReturnValue({ userId: 'u1', tokenVersion: 3 });

    const fakeUser = {
      id: 'u1',
      tokenVersion: 3,
      email: 'u@u.com',
      passwordHash: 'hash',
      name: 'U',
      role: 'CUSTOMER' as const,
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(prisma.user.findUnique).mockResolvedValue(fakeUser as any);
    vi.mocked(prisma.user.update).mockResolvedValue({
      ...fakeUser,
      tokenVersion: 4,
    } as any);

    const result = await refreshUserToken('old-refresh-token');

    expect(result.accessToken).toBe('mock-access-token');
    expect(result.refreshToken).toBe('mock-refresh-token');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { tokenVersion: { increment: 1 } },
    });
  });

  it('should throw TokenRefreshError if version mismatch', async () => {
    vi.mocked(verifyRefreshToken).mockReturnValue({
      userId: 'u1',
      tokenVersion: 2,
    });
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'u1',
      tokenVersion: 5,
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
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1' } as any);
    vi.mocked(prisma.passwordResetToken.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.passwordResetToken.create).mockResolvedValue({} as any);
    const token = await requestPasswordReset('ok@ok.com');
    expect(token).toBeTruthy();
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
    const matchedToken = {
      id: 'rt1',
      userId: 'u1',
      tokenHash: 'hashed',
      expiresAt: new Date(Date.now() + 10000),
    } as any;
    vi.mocked(prisma.passwordResetToken.findMany).mockResolvedValue([matchedToken]);
    vi.mocked(bcrypt.compare).mockResolvedValueOnce(true as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as any);
    vi.mocked(prisma.passwordResetToken.delete).mockResolvedValue({} as any);

    await expect(resetPassword('valid-token', 'NewPass456!')).resolves.toBeUndefined();
    expect(bcrypt.hash).toHaveBeenCalledWith('NewPass456!', 12);
    expect(prisma.user.update).toHaveBeenCalled();
    expect(prisma.passwordResetToken.delete).toHaveBeenCalledWith({
      where: { id: 'rt1' },
    });
  });
});
