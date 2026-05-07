/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/order.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getUserOrders,
  getOrderById,
  cancelOrder,
  OrderCancellationError,
} from '../../services/order.service.js';

// Mock the database module
vi.mock('../../db.js', () => {
  return {
    prisma: {
      order: {
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      productVariation: {
        update: vi.fn(),
      },
      $transaction: vi.fn((callback: any) => callback(prisma)),
    },
  };
});

import { prisma } from '../../db.js';

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getUserOrders (unchanged)
// ---------------------------------------------------------------------------
describe('getUserOrders', () => {
  it('should return paginated orders with customerId filter', async () => {
    const mockOrders = [{ id: 'o1', customerId: 'user-1', status: 'CONFIRMED', items: [] }];
    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders as any);
    vi.mocked(prisma.order.count).mockResolvedValue(1);

    const result = await getUserOrders('user-1', { page: 1, limit: 5 });
    expect(result.orders).toHaveLength(1);
    expect(result.pagination.totalItems).toBe(1);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { customerId: 'user-1' }, skip: 0, take: 5 }),
    );
  });

  it('should filter by status', async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([]);
    vi.mocked(prisma.order.count).mockResolvedValue(0);

    await getUserOrders('user-1', { status: 'CONFIRMED' });
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { customerId: 'user-1', status: 'CONFIRMED' } }),
    );
  });
});

// ---------------------------------------------------------------------------
// getOrderById (unchanged)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// cancelOrder (new)
// ---------------------------------------------------------------------------
describe('cancelOrder', () => {
  it('should cancel a PENDING order and restore stock', async () => {
    const mockOrder = {
      id: 'o1',
      customerId: 'user-1',
      status: 'PENDING',
      items: [
        { variationId: 'var-1', quantity: 2 },
        { variationId: null, quantity: 1 }, // no variation – stock not restored
      ],
    };
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);

    const cancelledOrder = {
      ...mockOrder,
      status: 'CANCELLED',
      items: [...mockOrder.items],
    };
    vi.mocked(prisma.order.update).mockResolvedValue(cancelledOrder as any);

    const result = await cancelOrder('o1', 'user-1');
    expect(result.status).toBe('CANCELLED');
    expect(prisma.productVariation.update).toHaveBeenCalledWith({
      where: { id: 'var-1' },
      data: { stockQty: { increment: 2 } },
    });
    expect(prisma.productVariation.update).toHaveBeenCalledTimes(1);
  });

  it('should cancel a CONFIRMED order', async () => {
    const mockOrder = {
      id: 'o2',
      customerId: 'user-1',
      status: 'CONFIRMED',
      items: [],
    };
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);
    vi.mocked(prisma.order.update).mockResolvedValue({ ...mockOrder, status: 'CANCELLED' } as any);

    const result = await cancelOrder('o2', 'user-1');
    expect(result.status).toBe('CANCELLED');
  });

  it('should throw OrderCancellationError if order is already SHIPPED', async () => {
    const mockOrder = { id: 'o3', customerId: 'user-1', status: 'SHIPPED', items: [] };
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);

    await expect(cancelOrder('o3', 'user-1')).rejects.toThrow(OrderCancellationError);
  });

  it('should throw OrderCancellationError if order does not belong to user', async () => {
    const mockOrder = { id: 'o4', customerId: 'other', status: 'PENDING', items: [] };
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);

    await expect(cancelOrder('o4', 'user-1')).rejects.toThrow(OrderCancellationError);
  });
});
