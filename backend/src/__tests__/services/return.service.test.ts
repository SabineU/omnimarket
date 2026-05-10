/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/return.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  requestReturn,
  processRefund,
  ReturnRequestError,
  RefundProcessError,
} from '../../services/return.service.js';

// Mock the database module
vi.mock('../../db.js', () => {
  return {
    prisma: {
      order: {
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
// requestReturn
// ---------------------------------------------------------------------------
describe('requestReturn', () => {
  it('should allow the owner to request return for a delivered order', async () => {
    const mockOrder = {
      id: 'o1',
      customerId: 'user-1',
      status: 'DELIVERED',
    };
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);
    vi.mocked(prisma.order.update).mockResolvedValue({
      ...mockOrder,
      status: 'RETURN_REQUESTED',
    } as any);

    const result = await requestReturn('o1', 'user-1', 'Damaged item');
    expect(result.status).toBe('RETURN_REQUESTED');
    expect(prisma.order.update).toHaveBeenCalledWith({
      where: { id: 'o1' },
      data: { status: 'RETURN_REQUESTED' },
    });
  });

  it('should throw ReturnRequestError if order not found', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null);
    await expect(requestReturn('bad-id', 'user-1')).rejects.toThrow(ReturnRequestError);
  });

  it('should throw ReturnRequestError if order does not belong to user', async () => {
    const mockOrder = { id: 'o1', customerId: 'other', status: 'DELIVERED' };
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);
    await expect(requestReturn('o1', 'user-1')).rejects.toThrow(ReturnRequestError);
  });

  it('should throw ReturnRequestError if order status is not DELIVERED', async () => {
    const mockOrder = { id: 'o1', customerId: 'user-1', status: 'CONFIRMED' };
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);
    await expect(requestReturn('o1', 'user-1')).rejects.toThrow(ReturnRequestError);
  });
});

// ---------------------------------------------------------------------------
// processRefund
// ---------------------------------------------------------------------------
describe('processRefund', () => {
  it('should approve a return and change status to RETURNED', async () => {
    const mockOrder = { id: 'o1', status: 'RETURN_REQUESTED' };
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);
    vi.mocked(prisma.order.update).mockResolvedValue({
      ...mockOrder,
      status: 'RETURNED',
    } as any);

    const result = await processRefund('o1', 'APPROVE');
    expect(result.status).toBe('RETURNED');
  });

  it('should reject a return and change status back to DELIVERED', async () => {
    const mockOrder = { id: 'o1', status: 'RETURN_REQUESTED' };
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);
    vi.mocked(prisma.order.update).mockResolvedValue({
      ...mockOrder,
      status: 'DELIVERED',
    } as any);

    const result = await processRefund('o1', 'REJECT');
    expect(result.status).toBe('DELIVERED');
  });

  it('should throw RefundProcessError if order not found', async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null);
    await expect(processRefund('bad-id', 'APPROVE')).rejects.toThrow(RefundProcessError);
  });

  it('should throw RefundProcessError if order is not in RETURN_REQUESTED state', async () => {
    const mockOrder = { id: 'o1', status: 'CONFIRMED' };
    vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder as any);
    await expect(processRefund('o1', 'APPROVE')).rejects.toThrow(RefundProcessError);
  });
});
