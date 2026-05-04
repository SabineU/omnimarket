/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/admin.service.test.ts
// Unit tests for the admin service.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { approveSeller, SellerNotFoundError } from '../../services/admin.service.js';

// Mock the database module
vi.mock('../../db.js', () => {
  return {
    prisma: {
      sellerProfile: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    },
  };
});

import { prisma } from '../../db.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('approveSeller', () => {
  it('should approve a seller when profile exists and user is a seller', async () => {
    const mockProfile = {
      userId: 'seller-1',
      isApproved: false,
      user: { role: 'SELLER' },
    } as any;
    vi.mocked(prisma.sellerProfile.findUnique).mockResolvedValue(mockProfile);
    const updatedProfile = { ...mockProfile, isApproved: true };
    vi.mocked(prisma.sellerProfile.update).mockResolvedValue(updatedProfile as any);

    const result = await approveSeller('seller-1', true);
    expect(result.isApproved).toBe(true);
    expect(prisma.sellerProfile.update).toHaveBeenCalledWith({
      where: { userId: 'seller-1' },
      data: { isApproved: true },
    });
  });

  it('should reject a seller (isApproved = false)', async () => {
    const mockProfile = {
      userId: 'seller-2',
      isApproved: true,
      user: { role: 'SELLER' },
    } as any;
    vi.mocked(prisma.sellerProfile.findUnique).mockResolvedValue(mockProfile);
    const updatedProfile = { ...mockProfile, isApproved: false };
    vi.mocked(prisma.sellerProfile.update).mockResolvedValue(updatedProfile as any);

    const result = await approveSeller('seller-2', false);
    expect(result.isApproved).toBe(false);
  });

  it('should throw SellerNotFoundError if profile does not exist', async () => {
    vi.mocked(prisma.sellerProfile.findUnique).mockResolvedValue(null);
    await expect(approveSeller('nonexistent', true)).rejects.toThrow(SellerNotFoundError);
  });

  it('should throw if user is not a seller (profile exists but role wrong)', async () => {
    const mockProfile = {
      userId: 'user-1',
      isApproved: false,
      user: { role: 'CUSTOMER' },
    } as any;
    vi.mocked(prisma.sellerProfile.findUnique).mockResolvedValue(mockProfile);
    await expect(approveSeller('user-1', true)).rejects.toThrow('User is not a seller');
  });
});
