/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/user.service.test.ts
// Unit tests for the user service.
// We mock Prisma to isolate business logic.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getProfile, updateProfile } from '../../services/user.service.js';

// Mock the database module
vi.mock('../../db.js', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    },
  };
});

import { prisma } from '../../db.js';

// We'll also mock sanitizeUser indirectly – the real one is imported from auth.service,
// but that code is tested separately. Here we just let it run (it only destructures).
// However, to keep unit tests fast, we ensure our mock data doesn't have passwordHash once sanitized.

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getProfile', () => {
  it('should return sanitized user when user exists', async () => {
    const fakeUser = {
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: 'hashed-secret',
      name: 'Test User',
      role: 'CUSTOMER' as const,
      avatarUrl: null,
      tokenVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(prisma.user.findUnique).mockResolvedValue(fakeUser as any);

    const result = await getProfile('user-1');
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.email).toBe('user@example.com');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } });
  });

  it('should throw if user not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    await expect(getProfile('nonexistent')).rejects.toThrow('User not found');
  });
});

describe('updateProfile', () => {
  it('should update user and return sanitized result', async () => {
    const existingUser = {
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: 'hash',
      name: 'Old Name',
      role: 'CUSTOMER' as const,
      avatarUrl: null,
      tokenVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const updatedUser = {
      ...existingUser,
      name: 'New Name',
      avatarUrl: 'http://example.com/avatar.png',
    };

    vi.mocked(prisma.user.findUnique).mockResolvedValue(existingUser as any);
    vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as any);

    const result = await updateProfile('user-1', {
      name: 'New Name',
      avatarUrl: 'http://example.com/avatar.png',
    });
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.name).toBe('New Name');
    expect(result.avatarUrl).toBe('http://example.com/avatar.png');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { name: 'New Name', avatarUrl: 'http://example.com/avatar.png' },
    });
  });

  it('should throw if user does not exist', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    await expect(updateProfile('bad-id', { name: 'New' })).rejects.toThrow('User not found');
  });
});
