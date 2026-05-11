/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/coupon-admin.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createCoupon,
  listCoupons,
  updateCoupon,
  deleteCoupon,
} from '../../services/coupon-admin.service.js';

vi.mock('../../db.js', () => {
  return {
    prisma: {
      coupon: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    },
  };
});

import { prisma } from '../../db.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createCoupon', () => {
  it('should create a coupon with all fields', async () => {
    const input = {
      code: 'SAVE10',
      discountType: 'PERCENTAGE' as const,
      discountValue: 10,
      minCartAmount: 50,
      usageLimit: 100,
    };
    const created = { id: 'c1', ...input, usedCount: 0, expiresAt: null, createdAt: new Date() };
    vi.mocked(prisma.coupon.create).mockResolvedValue(created as any);

    const result = await createCoupon(input);
    expect(result.code).toBe('SAVE10');
    expect(prisma.coupon.create).toHaveBeenCalledWith({
      data: {
        code: 'SAVE10',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        minCartAmount: 50,
        usageLimit: 100,
        expiresAt: null,
      },
    });
  });
});

describe('listCoupons', () => {
  it('should list all coupons without search', async () => {
    vi.mocked(prisma.coupon.findMany).mockResolvedValue([]);
    const result = await listCoupons();
    expect(result).toEqual([]);
    expect(prisma.coupon.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it('should filter coupons by search', async () => {
    await listCoupons('SAVE');
    expect(prisma.coupon.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { code: { contains: 'SAVE', mode: 'insensitive' } },
      }),
    );
  });
});

describe('updateCoupon', () => {
  it('should update a coupon', async () => {
    vi.mocked(prisma.coupon.findUniqueOrThrow).mockResolvedValue({ id: 'c1' } as any);
    const updated = { id: 'c1', code: 'SAVE20' } as any;
    vi.mocked(prisma.coupon.update).mockResolvedValue(updated);

    const result = await updateCoupon('c1', { code: 'SAVE20' });
    expect(result.code).toBe('SAVE20');
    expect(prisma.coupon.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { code: 'SAVE20' },
    });
  });
});

describe('deleteCoupon', () => {
  it('should delete a coupon', async () => {
    vi.mocked(prisma.coupon.findUniqueOrThrow).mockResolvedValue({ id: 'c1' } as any);
    vi.mocked(prisma.coupon.delete).mockResolvedValue({} as any);

    await expect(deleteCoupon('c1')).resolves.toBeUndefined();
    expect(prisma.coupon.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });
});
