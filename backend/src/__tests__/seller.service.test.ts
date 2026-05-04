/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/seller.service.test.ts
// Unit tests for the seller service.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSellerProfile, upsertSellerProfile } from '../services/seller.service.js';

// Mock the database module
vi.mock('../db.js', () => {
  return {
    prisma: {
      sellerProfile: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
    },
  };
});

import { prisma } from '../db.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getSellerProfile', () => {
  it('should return the profile if it exists', async () => {
    const mockProfile = { userId: 'seller-1', storeName: 'My Store' } as any;
    vi.mocked(prisma.sellerProfile.findUnique).mockResolvedValue(mockProfile);

    const result = await getSellerProfile('seller-1');
    expect(result).toEqual(mockProfile);
    expect(prisma.sellerProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: 'seller-1' },
    });
  });

  it('should return null if no profile exists', async () => {
    vi.mocked(prisma.sellerProfile.findUnique).mockResolvedValue(null);
    const result = await getSellerProfile('seller-1');
    expect(result).toBeNull();
  });
});

describe('upsertSellerProfile', () => {
  it('should upsert with the correct data', async () => {
    const input = {
      storeName: 'Awesome Store',
      description: 'Selling awesome stuff',
    };
    const mockResult = { userId: 'seller-1', ...input, isApproved: false } as any;
    vi.mocked(prisma.sellerProfile.upsert).mockResolvedValue(mockResult);

    const result = await upsertSellerProfile('seller-1', input);
    expect(result).toEqual(mockResult);
    expect(prisma.sellerProfile.upsert).toHaveBeenCalledWith({
      where: { userId: 'seller-1' },
      update: {
        storeName: 'Awesome Store',
        description: 'Selling awesome stuff',
        payoutDetails: undefined,
      },
      create: {
        userId: 'seller-1',
        storeName: 'Awesome Store',
        description: 'Selling awesome stuff',
        payoutDetails: undefined,
        isApproved: false,
      },
    });
  });
});
