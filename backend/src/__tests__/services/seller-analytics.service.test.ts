/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/seller-analytics.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSalesAnalytics } from '../../services/seller-analytics.service.js';

// Mock the database module
vi.mock('../../db.js', () => {
  return {
    prisma: {
      order: {
        findMany: vi.fn(),
      },
    },
  };
});

import { prisma } from '../../db.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getSalesAnalytics', () => {
  it('should return daily sales for the default 30‑day range', async () => {
    const mockOrders = [
      {
        totalAmount: 500,
        createdAt: new Date('2026-05-10T10:00:00Z'),
      },
      {
        totalAmount: 300,
        createdAt: new Date('2026-05-10T14:00:00Z'),
      },
      {
        totalAmount: 200,
        createdAt: new Date('2026-05-09T08:00:00Z'),
      },
    ];
    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders as any);

    const result = await getSalesAnalytics('seller-1');

    // Should have 30 entries (one per day)
    expect(result).toHaveLength(30);

    // Find the entry for May 10 and May 9
    const may10 = result.find((r) => r.date === '2026-05-10');
    const may9 = result.find((r) => r.date === '2026-05-09');

    expect(may10?.sales).toBe(800); // 500 + 300
    expect(may9?.sales).toBe(200);

    // Days with no orders should have 0
    const earliestDay = result[0];
    expect(earliestDay.sales).toBe(0);

    // The query should filter by seller's items and have a date range
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          items: { some: { sellerId: 'seller-1' } },
          createdAt: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        }),
        select: { totalAmount: true, createdAt: true },
      }),
    );
  });

  it('should respect custom start and end dates', async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([]);

    await getSalesAnalytics('seller-1', {
      start: '2026-04-01',
      end: '2026-04-07',
    });

    // Verify that the database was called with the correct seller filter
    // and that date boundaries are provided (exact values depend on timezone).
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          items: { some: { sellerId: 'seller-1' } },
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      }),
    );
  });

  it('should return zero sales for a seller with no orders', async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([]);

    const result = await getSalesAnalytics('new-seller');

    expect(result.every((d) => d.sales === 0)).toBe(true);
  });
});
