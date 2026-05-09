/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/admin-order.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAllOrders, getAdminOrderById } from '../../services/admin-order.service.js';

// Mock the database module
vi.mock('../../db.js', () => {
  return {
    prisma: {
      order: {
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
      },
    },
  };
});

import { prisma } from '../../db.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getAllOrders', () => {
  it('should return all orders with pagination', async () => {
    const mockOrders = [{ id: 'o1', customer: { name: 'Alice', email: 'a@test.com' }, items: [] }];
    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders as any);
    vi.mocked(prisma.order.count).mockResolvedValue(1);

    const result = await getAllOrders({ page: 1, limit: 10 });
    expect(result.orders).toHaveLength(1);
    expect(result.pagination.totalItems).toBe(1);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        skip: 0,
        take: 10,
      }),
    );
  });

  it('should filter by status', async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([]);
    vi.mocked(prisma.order.count).mockResolvedValue(0);

    await getAllOrders({ status: 'CONFIRMED' });
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'CONFIRMED' },
      }),
    );
  });
});

describe('getAdminOrderById', () => {
  it('should return the order with customer and seller info', async () => {
    const mockOrder = {
      id: 'o1',
      customer: { name: 'Alice', email: 'a@test.com' },
      items: [{ seller: { storeName: 'Store A' } }],
    };
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);

    const order = await getAdminOrderById('o1');
    // Check that the service calls findUnique with the correct include
    expect(order.id).toBe('o1');
    expect(prisma.order.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'o1' },
        include: expect.objectContaining({
          customer: { select: { name: true, email: true } },
          items: expect.objectContaining({
            include: expect.objectContaining({
              seller: { select: { storeName: true } },
            }),
          }),
        }),
      }),
    );
  });

  it('should throw if order not found', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null);
    await expect(getAdminOrderById('bad-id')).rejects.toThrow('Order not found');
  });
});
