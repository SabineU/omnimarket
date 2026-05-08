/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/seller-order.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getSellerOrders,
  getSellerOrderById,
  updateOrderStatus,
} from '../../services/seller-order.service.js';

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
    },
  };
});

import { prisma } from '../../db.js';

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getSellerOrders
// ---------------------------------------------------------------------------
describe('getSellerOrders', () => {
  it('should return only orders containing the seller’s items', async () => {
    const mockOrders = [{ id: 'o1', customerId: 'cust1', status: 'CONFIRMED', items: [] }];
    vi.mocked(prisma.order.findMany).mockResolvedValue(mockOrders as any);
    vi.mocked(prisma.order.count).mockResolvedValue(1);

    const result = await getSellerOrders('seller-1', { page: 1, limit: 10 });
    expect(result.orders).toHaveLength(1);
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { items: { some: { sellerId: 'seller-1' } } },
        include: expect.objectContaining({
          items: expect.objectContaining({ where: { sellerId: 'seller-1' } }),
        }),
      }),
    );
  });

  it('should filter by order status', async () => {
    vi.mocked(prisma.order.findMany).mockResolvedValue([]);
    vi.mocked(prisma.order.count).mockResolvedValue(0);

    await getSellerOrders('seller-1', { status: 'CONFIRMED' });
    expect(prisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          items: { some: { sellerId: 'seller-1' } },
          status: 'CONFIRMED',
        },
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// getSellerOrderById
// ---------------------------------------------------------------------------
describe('getSellerOrderById', () => {
  it('should return order with only the seller’s items', async () => {
    const mockOrder = {
      id: 'o1',
      customerId: 'cust1',
      status: 'CONFIRMED',
      items: [{ sellerId: 'seller-1', productId: 'p1' }],
    };
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);

    const order = await getSellerOrderById('o1', 'seller-1');
    expect(order.id).toBe('o1');
    expect(prisma.order.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'o1' },
        include: expect.objectContaining({
          items: expect.objectContaining({ where: { sellerId: 'seller-1' } }),
        }),
      }),
    );
  });

  it('should throw if order has no items for the seller', async () => {
    const mockOrder = { id: 'o1', items: [] };
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);

    await expect(getSellerOrderById('o1', 'seller-1')).rejects.toThrow('Order not found');
  });

  it('should throw if order does not exist', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null);
    await expect(getSellerOrderById('nonexistent', 'seller-1')).rejects.toThrow('Order not found');
  });
});

// ---------------------------------------------------------------------------
// updateOrderStatus
// ---------------------------------------------------------------------------
describe('updateOrderStatus', () => {
  it('should transition from PENDING to CONFIRMED', async () => {
    const mockOrder = {
      id: 'o1',
      status: 'PENDING',
      items: [{ sellerId: 'seller-1' }],
    };
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);
    const updated = { ...mockOrder, status: 'CONFIRMED' };
    vi.mocked(prisma.order.update).mockResolvedValue(updated as any);

    const result = await updateOrderStatus('seller-1', 'o1', 'CONFIRMED');
    expect(result.status).toBe('CONFIRMED');
    // The real call includes an `include` clause; we verify the core properties
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'o1' },
        data: { status: 'CONFIRMED' },
      }),
    );
  });

  it('should transition from CONFIRMED to SHIPPED', async () => {
    const mockOrder = {
      id: 'o2',
      status: 'CONFIRMED',
      items: [{ sellerId: 'seller-1' }],
    };
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);
    vi.mocked(prisma.order.update).mockResolvedValue({
      ...mockOrder,
      status: 'SHIPPED',
    } as any);

    const result = await updateOrderStatus('seller-1', 'o2', 'SHIPPED');
    expect(result.status).toBe('SHIPPED');
  });

  it('should throw for invalid transition (CONFIRMED → CONFIRMED)', async () => {
    const mockOrder = {
      id: 'o3',
      status: 'CONFIRMED',
      items: [{ sellerId: 'seller-1' }],
    };
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);

    await expect(updateOrderStatus('seller-1', 'o3', 'CONFIRMED')).rejects.toThrow(
      'Cannot move order from CONFIRMED to CONFIRMED',
    );
  });

  it('should throw if seller not in order', async () => {
    // The order belongs to a different seller and can legally transition
    const mockOrder = {
      id: 'o4',
      status: 'PENDING',
      items: [{ sellerId: 'other-seller' }],
    };
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);

    await expect(updateOrderStatus('seller-1', 'o4', 'CONFIRMED')).rejects.toThrow(
      /not found|seller|items/i,
    );
  });
});
