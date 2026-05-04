/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/user.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getProfile, updateProfile, anonymizeUser } from '../../services/user.service.js';

// Mock the database module
vi.mock('../../db.js', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      // We also need to mock address, cartItem, review for $transaction
      address: { deleteMany: vi.fn() },
      cartItem: { deleteMany: vi.fn() },
      review: { deleteMany: vi.fn() },
      // $transaction will be mocked to run the callback with the mock prisma itself
      $transaction: vi.fn((callback: any) => callback(prisma)),
    },
  };
});

import { prisma } from '../../db.js';

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------- Existing tests for getProfile / updateProfile (unchanged) ----------

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

// ---------- New tests for anonymizeUser ----------

describe('anonymizeUser', () => {
  it('should anonymize user, delete related data, and increment tokenVersion', async () => {
    const existingUser = {
      id: 'user-to-delete',
      email: 'delete-me@example.com',
      passwordHash: 'some-hash',
      name: 'Delete Me',
      role: 'CUSTOMER' as const,
      avatarUrl: 'http://example.com/avatar.png',
      tokenVersion: 5,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const anonymizedUser = {
      ...existingUser,
      email: `deleted-${existingUser.id.slice(0, 8)}@omnimarket.local`,
      name: 'Deleted User',
      avatarUrl: null,
      passwordHash: '',
      tokenVersion: 6,
    };

    vi.mocked(prisma.user.update).mockResolvedValue(anonymizedUser as any);
    vi.mocked(prisma.address.deleteMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.cartItem.deleteMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.review.deleteMany).mockResolvedValue({ count: 1 });

    const result = await anonymizeUser(existingUser.id);

    // Verify that related data deletion statements were executed
    expect(prisma.address.deleteMany).toHaveBeenCalledWith({ where: { userId: existingUser.id } });
    expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({ where: { userId: existingUser.id } });
    expect(prisma.review.deleteMany).toHaveBeenCalledWith({
      where: { customerId: existingUser.id },
    });

    // Verify that the user update was called with the correct data
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: existingUser.id },
      data: {
        email: `deleted-${existingUser.id.slice(0, 8)}@omnimarket.local`,
        name: 'Deleted User',
        avatarUrl: null,
        passwordHash: '',
        tokenVersion: { increment: 1 },
      },
    });

    // The result should be the sanitized anonymized user
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.email).toContain('deleted-');
    expect(result.name).toBe('Deleted User');
    expect(result.tokenVersion).toBe(6);
  });
});
