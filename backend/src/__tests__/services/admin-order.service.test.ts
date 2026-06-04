/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/admin-order.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAllOrders, getAdminOrderById } from '../../services/admin-order.service.js';

vi.mock('../../db.js', () => ({
  prisma: {
    order: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from '../../db.js';

beforeEach((): void => {
  vi.clearAllMocks();
});

describe('getAllOrders', () => {
  it('should return order summaries with customer info, no items', async (): Promise<void> => {
    const mockOrders = [
      {
        id: 'o1',
        status: 'CONFIRMED',
        totalAmount: 150, // Prisma Decimal, we'll convert to string
        createdAt: new Date('2026-06-01'),
        customer: { name: 'Alice', email: 'a@test.com' },
      },
    ];
    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders as any);
    vi.mocked(prisma.order.count).mockResolvedValue(1);

    const result = await getAllOrders({ page: 1, limit: 10 });

    expect(result.orders).toHaveLength(1);
    expect(result.orders[0].id).toBe('o1');
    expect(result.orders[0].customer.name).toBe('Alice');
    expect(result.orders[0].totalAmount).toBe('150');
    expect(result.orders[0].status).toBe('CONFIRMED');
    // No `items` field
    expect((result.orders[0] as any).items).toBeUndefined();

    // Verify the Prisma call uses `select` not `include`
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          customer: { select: { name: true, email: true } },
        }),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 10,
      }),
    );
  });

  it('should filter by status', async (): Promise<void> => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([]);
    vi.mocked(prisma.order.count).mockResolvedValue(0);

    await getAllOrders({ status: 'CONFIRMED' });
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'CONFIRMED' },
      }),
    );
  });

  it('should respect pagination', async (): Promise<void> => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([]);
    vi.mocked(prisma.order.count).mockResolvedValue(50);

    await getAllOrders({ page: 3, limit: 5 });
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 5 }),
    );
  });
});

describe('getAdminOrderById', () => {
  it('should return order with items but without seller field', async (): Promise<void> => {
    const mockOrder = {
      id: 'o1',
      customer: { name: 'Alice', email: 'a@test.com' },
      status: 'CONFIRMED',
      items: [
        {
          product: { name: 'Widget', images: [{ url: '/img.jpg' }] },
          variation: null,
          // NO seller field
        },
      ],
    };
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);

    const result = await getAdminOrderById('o1');
    expect(result.id).toBe('o1');
    // Verify that the include does NOT contain seller
    expect(prisma.order.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          items: expect.objectContaining({
            include: expect.not.objectContaining({ seller: expect.any(Object) }),
          }),
        }),
      }),
    );
  });

  it('should throw if not found', async (): Promise<void> => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null);
    await expect(getAdminOrderById('bad')).rejects.toThrow('Order not found');
  });
});
