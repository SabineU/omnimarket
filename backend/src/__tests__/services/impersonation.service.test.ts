/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/impersonation.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { impersonateUser, ImpersonationError } from '../../services/impersonation.service.js';

// Mock the database module
vi.mock('../../db.js', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
      },
    },
  };
});

// Mock the JWT utility
vi.mock('../../utils/jwt.js', () => {
  return {
    generateImpersonationToken: vi.fn().mockReturnValue('mock-impersonation-token'),
  };
});

import { prisma } from '../../db.js';
import { generateImpersonationToken } from '../../utils/jwt.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('impersonateUser', () => {
  it('should return a token when target user is active', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'target-1',
      role: 'CUSTOMER',
      isActive: true,
    } as any);

    const token = await impersonateUser('target-1', 'admin-1');
    expect(token).toBe('mock-impersonation-token');
    expect(generateImpersonationToken).toHaveBeenCalledWith(
      { id: 'target-1', role: 'CUSTOMER' },
      { id: 'admin-1' },
    );
  });

  it('should throw if target user not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    await expect(impersonateUser('bad-id', 'admin-1')).rejects.toThrow(ImpersonationError);
  });

  it('should throw if target user is deactivated', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'target-1',
      role: 'CUSTOMER',
      isActive: false,
    } as any);
    await expect(impersonateUser('target-1', 'admin-1')).rejects.toThrow(ImpersonationError);
  });
});
