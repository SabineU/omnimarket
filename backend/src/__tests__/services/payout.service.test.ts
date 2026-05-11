/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/payout.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  requestPayout,
  processPayout,
  listPayouts,
  PayoutValidationError,
} from '../../services/payout.service.js';

vi.mock('../../db.js', () => {
  return {
    prisma: {
      sellerProfile: { findUnique: vi.fn() },
      orderItem: { findMany: vi.fn() },
      payoutRequest: {
        create: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
    },
  };
});

import { prisma } from '../../db.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('requestPayout', () => {
  it('should create a payout when amount ≤ net earnings', async () => {
    vi.mocked(prisma.sellerProfile.findUnique).mockResolvedValue({ commissionRate: 10 } as any);
    vi.mocked(prisma.orderItem.findMany).mockResolvedValue([
      { priceAtTime: 100, quantity: 2 }, // gross 200
    ] as any);
    vi.mocked(prisma.payoutRequest.count).mockResolvedValue(0);
    vi.mocked(prisma.payoutRequest.create).mockResolvedValue({
      id: 'pr-1',
      sellerId: 's1',
      amount: 150,
      status: 'PENDING',
    } as any);

    const result = await requestPayout('s1', 150);
    expect(result.amount).toBe(150);
    expect(result.status).toBe('PENDING');
  });

  it('should throw if amount exceeds net earnings', async () => {
    vi.mocked(prisma.sellerProfile.findUnique).mockResolvedValue({ commissionRate: 10 } as any);
    vi.mocked(prisma.orderItem.findMany).mockResolvedValue([
      { priceAtTime: 10, quantity: 1 },
    ] as any); // gross 10, net 9
    vi.mocked(prisma.payoutRequest.count).mockResolvedValue(0);

    await expect(requestPayout('s1', 100)).rejects.toThrow(PayoutValidationError);
  });

  it('should throw if a pending request already exists', async () => {
    vi.mocked(prisma.sellerProfile.findUnique).mockResolvedValue({ commissionRate: 10 } as any);
    vi.mocked(prisma.orderItem.findMany).mockResolvedValue([
      { priceAtTime: 1000, quantity: 1 },
    ] as any);
    vi.mocked(prisma.payoutRequest.count).mockResolvedValue(1);

    await expect(requestPayout('s1', 500)).rejects.toThrow(PayoutValidationError);
  });
});

describe('processPayout', () => {
  it('should approve a pending payout', async () => {
    vi.mocked(prisma.payoutRequest.findUnique).mockResolvedValue({
      id: 'pr-1',
      status: 'PENDING',
    } as any);
    vi.mocked(prisma.payoutRequest.update).mockResolvedValue({
      id: 'pr-1',
      status: 'PAID',
    } as any);

    const result = await processPayout('pr-1', 'APPROVE');
    expect(result.status).toBe('PAID');
  });

  it('should throw if already processed', async () => {
    vi.mocked(prisma.payoutRequest.findUnique).mockResolvedValue({
      id: 'pr-1',
      status: 'PAID',
    } as any);
    await expect(processPayout('pr-1', 'APPROVE')).rejects.toThrow(PayoutValidationError);
  });
});

describe('listPayouts', () => {
  it('should return all payouts with seller info', async () => {
    vi.mocked(prisma.payoutRequest.findMany).mockResolvedValue([{ id: 'pr-1' }] as any);
    const result = await listPayouts();
    expect(result).toHaveLength(1);
  });
});
