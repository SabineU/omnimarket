/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/order.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserOrders, getOrderById } from '../../services/order.service.js';

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

describe('getUserOrders', () => {
  it('should return paginated orders with customerId filter', async () => {
    const mockOrders = [{ id: 'o1', customerId: 'user-1', status: 'CONFIRMED', items: [] }];
    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders as any);
    vi.mocked(prisma.order.count).mockResolvedValue(1);

    const result = await getUserOrders('user-1', { page: 1, limit: 5 });

    expect(result.orders).toHaveLength(1);
    expect(result.pagination.totalItems).toBe(1);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { customerId: 'user-1' },
        skip: 0,
        take: 5,
      }),
    );
  });

  it('should filter by status', async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([]);
    vi.mocked(prisma.order.count).mockResolvedValue(0);

    await getUserOrders('user-1', { status: 'CONFIRMED' });
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { customerId: 'user-1', status: 'CONFIRMED' },
      }),
    );
  });
});

describe('getOrderById', () => {
  it('should return the order if it belongs to the user', async () => {
    const mockOrder = { id: 'o1', customerId: 'user-1', items: [] };
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);

    const order = await getOrderById('o1', 'user-1');
    expect(order.id).toBe('o1');
  });

  it('should throw if order not found', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null);

    await expect(getOrderById('bad-id', 'user-1')).rejects.toThrow('Order not found');
  });

  it('should throw if order belongs to another user', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      id: 'o1',
      customerId: 'other-user',
    } as any);

    await expect(getOrderById('o1', 'user-1')).rejects.toThrow('Order not found');
  });
});
