/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/seller-dashboard.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDashboardSummary } from '../../services/seller-dashboard.service.js';

// Mock the database module
vi.mock('../../db.js', () => {
  return {
    prisma: {
      order: {
        aggregate: vi.fn(),
        count: vi.fn(),
      },
      product: {
        count: vi.fn(),
      },
      review: {
        aggregate: vi.fn(),
      },
    },
  };
});

import { prisma } from '../../db.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getDashboardSummary', () => {
  it('should return all dashboard stats for a seller', async () => {
    // Mock today's sales aggregation
    vi.mocked(prisma.order.aggregate).mockResolvedValue({
      _sum: { totalAmount: 2500 },
    } as any);

    // Mock pending orders count
    vi.mocked(prisma.order.count).mockResolvedValue(3);

    // Mock product count
    vi.mocked(prisma.product.count).mockResolvedValue(15);

    // Mock review aggregation
    vi.mocked(prisma.review.aggregate).mockResolvedValue({
      _count: { id: 8 },
      _avg: { rating: 4.5 },
    } as any);

    const result = await getDashboardSummary('seller-1');

    expect(result.todaySales).toBe(2500);
    expect(result.pendingOrders).toBe(3);
    expect(result.totalProducts).toBe(15);
    expect(result.totalReviews).toBe(8);
    expect(result.averageRating).toBe(4.5);

    // Verify the filters are correctly applied
    expect(prisma.order.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          items: { some: { sellerId: 'seller-1' } },
          createdAt: expect.any(Object),
        }),
        _sum: { totalAmount: true },
      }),
    );

    expect(prisma.order.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          items: { some: { sellerId: 'seller-1' } },
          status: 'PENDING',
        }),
      }),
    );
  });

  it('should return zeros when no data exists', async () => {
    vi.mocked(prisma.order.aggregate).mockResolvedValue({
      _sum: { totalAmount: null },
    } as any);
    vi.mocked(prisma.order.count).mockResolvedValue(0);
    vi.mocked(prisma.product.count).mockResolvedValue(0);
    vi.mocked(prisma.review.aggregate).mockResolvedValue({
      _count: { id: 0 },
      _avg: { rating: null },
    } as any);

    const result = await getDashboardSummary('seller-2');

    expect(result.todaySales).toBe(0);
    expect(result.pendingOrders).toBe(0);
    expect(result.totalProducts).toBe(0);
    expect(result.totalReviews).toBe(0);
    expect(result.averageRating).toBe(0);
  });
});
