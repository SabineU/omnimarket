/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/admin-user.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  listUsers,
  getUserById,
  toggleUserActiveStatus,
  deleteUser,
} from '../../services/admin-user.service.js';

// Mock the database module
vi.mock('../../db.js', () => {
  return {
    prisma: {
      user: {
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    },
  };
});

// Mock the user.service to avoid real anonymize logic
vi.mock('../../services/user.service.js', () => {
  return {
    anonymizeUser: vi.fn().mockResolvedValue(undefined),
  };
});

import { prisma } from '../../db.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('listUsers', () => {
  it('should return paginated users', async () => {
    const mockUsers = [{ id: 'u1', name: 'Alice' }];
    vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any);
    vi.mocked(prisma.user.count).mockResolvedValue(1);

    const result = await listUsers({ page: 1, limit: 10 });
    expect(result.users).toHaveLength(1);
    expect(result.pagination.totalItems).toBe(1);
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, skip: 0, take: 10 }),
    );
  });

  it('should filter by role and search', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);
    vi.mocked(prisma.user.count).mockResolvedValue(0);

    await listUsers({ role: 'SELLER', search: 'bob' });
    const where = (prisma.user.findMany as any).mock.calls[0][0].where;
    expect(where.role).toBe('SELLER');
    expect(where.OR).toHaveLength(2);
  });
});

describe('getUserById', () => {
  it('should return user if found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1' } as any);
    const user = await getUserById('u1');
    expect(user.id).toBe('u1');
  });

  it('should throw if not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    await expect(getUserById('bad')).rejects.toThrow('User not found');
  });
});

describe('toggleUserActiveStatus', () => {
  it('should update isActive', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'u1' } as any);
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: 'u1',
      isActive: false,
    } as any);

    const user = await toggleUserActiveStatus('u1', false);
    expect(user.isActive).toBe(false);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { isActive: false },
    });
  });
});

describe('deleteUser', () => {
  it('should call anonymizeUser', async () => {
    // The mock function is already set up to resolve to undefined
    await deleteUser('u1');
    const { anonymizeUser } = await import('../../services/user.service.js');
    expect(anonymizeUser).toHaveBeenCalledWith('u1');
  });
});
