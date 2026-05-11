/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/admin-dashboard.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAdminDashboard } from '../../services/admin-dashboard.service.js';

// Mock the database module
vi.mock('../../db.js', () => {
  return {
    prisma: {
      order: {
        aggregate: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
      user: {
        count: vi.fn(),
      },
      product: {
        count: vi.fn(),
      },
    },
  };
});

import { prisma } from '../../db.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getAdminDashboard', () => {
  it('should return all dashboard statistics', async () => {
    // Mock revenue aggregation
    vi.mocked(prisma.order.aggregate).mockResolvedValue({
      _sum: { totalAmount: 54000 },
    } as any);

    // Mock counts
    vi.mocked(prisma.order.count).mockResolvedValue(128);

    // Mock user counts: customers and sellers
    vi.mocked(prisma.user.count)
      .mockResolvedValueOnce(89) // customers
      .mockResolvedValueOnce(12); // sellers

    // Mock product count
    vi.mocked(prisma.product.count).mockResolvedValue(250);

    // Mock recent orders
    const mockOrders = [
      {
        id: 'o1',
        totalAmount: 1500,
        status: 'CONFIRMED',
        createdAt: new Date('2026-05-11T10:00:00Z'),
        customer: { name: 'Alice' },
      },
      {
        id: 'o2',
        totalAmount: 300,
        status: 'PENDING',
        createdAt: new Date('2026-05-10T08:00:00Z'),
        customer: { name: 'Bob' },
      },
    ];
    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders as any);

    const result = await getAdminDashboard();

    expect(result.totalRevenue).toBe(54000);
    expect(result.totalOrders).toBe(128);
    expect(result.totalCustomers).toBe(89);
    expect(result.totalSellers).toBe(12);
    expect(result.totalProducts).toBe(250);
    expect(result.recentOrders).toHaveLength(2);
    expect(result.recentOrders[0].customerName).toBe('Alice');
    expect(result.recentOrders[1].customerName).toBe('Bob');
  });

  it('should return zeros when database is empty', async () => {
    vi.mocked(prisma.order.aggregate).mockResolvedValue({
      _sum: { totalAmount: null },
    } as any);
    vi.mocked(prisma.order.count).mockResolvedValue(0);
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.product.count).mockResolvedValue(0);
    vi.mocked(prisma.order.findMany).mockResolvedValue([]);

    const result = await getAdminDashboard();
    expect(result.totalRevenue).toBe(0);
    expect(result.totalOrders).toBe(0);
    expect(result.totalCustomers).toBe(0);
    expect(result.totalSellers).toBe(0);
    expect(result.totalProducts).toBe(0);
    expect(result.recentOrders).toHaveLength(0);
  });
});
