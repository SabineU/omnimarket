/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/coupon.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateCoupon, CouponValidationError } from '../../services/coupon.service.js';

// Mock the database module
vi.mock('../../db.js', () => {
  return {
    prisma: {
      coupon: {
        findUnique: vi.fn(),
      },
    },
  };
});

import { prisma } from '../../db.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('validateCoupon', () => {
  it('should return coupon details when coupon is valid', async () => {
    const mockCoupon = {
      code: 'SAVE10',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minCartAmount: 50,
      usageLimit: 100,
      usedCount: 42,
      expiresAt: new Date(Date.now() + 3600_000),
    };
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue(mockCoupon as any);

    const result = await validateCoupon('SAVE10');
    expect(result.code).toBe('SAVE10');
    expect(result.discountType).toBe('PERCENTAGE');
    expect(result.discountValue).toBe(10);
    expect(result.minCartAmount).toBe(50);
  });

  it('should throw CouponValidationError if code not found', async () => {
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue(null);
    await expect(validateCoupon('INVALID')).rejects.toThrow(CouponValidationError);
    await expect(validateCoupon('INVALID')).rejects.toThrow('Invalid coupon code');
  });

  it('should throw CouponValidationError if coupon is expired', async () => {
    const mockCoupon = {
      code: 'EXPIRED',
      discountType: 'FIXED_AMOUNT',
      discountValue: 5,
      minCartAmount: null,
      usageLimit: null,
      usedCount: 0,
      expiresAt: new Date(Date.now() - 1000), // in the past
    };
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue(mockCoupon as any);

    await expect(validateCoupon('EXPIRED')).rejects.toThrow(CouponValidationError);
  });

  it('should throw CouponValidationError if usedCount >= usageLimit', async () => {
    const mockCoupon = {
      code: 'FULL',
      discountType: 'FIXED_AMOUNT',
      discountValue: 5,
      minCartAmount: null,
      usageLimit: 10,
      usedCount: 10,
      expiresAt: new Date(Date.now() + 3600_000),
    };
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue(mockCoupon as any);

    await expect(validateCoupon('FULL')).rejects.toThrow(CouponValidationError);
  });

  it('should accept coupon with unlimited usage (usageLimit = null)', async () => {
    const mockCoupon = {
      code: 'UNLIMITED',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      minCartAmount: 0,
      usageLimit: null,
      usedCount: 9999,
      expiresAt: null,
    };
    vi.mocked(prisma.coupon.findUnique).mockResolvedValue(mockCoupon as any);

    const result = await validateCoupon('UNLIMITED');
    expect(result.code).toBe('UNLIMITED');
  });
});
