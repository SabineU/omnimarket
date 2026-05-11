/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/seller-ledger.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSellerLedger } from '../../services/seller-ledger.service.js';

// Mock the database module
vi.mock('../../db.js', () => {
  return {
    prisma: {
      sellerProfile: {
        findUnique: vi.fn(),
      },
      orderItem: {
        findMany: vi.fn(),
      },
    },
  };
});

import { prisma } from '../../db.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getSellerLedger', () => {
  it('should calculate earnings and transactions correctly', async () => {
    // Mock commission rate
    vi.mocked(prisma.sellerProfile.findUnique).mockResolvedValue({
      commissionRate: 10,
    } as any);

    // Mock order items: one CONFIRMED, one CANCELLED
    vi.mocked(prisma.orderItem.findMany).mockResolvedValue([
      {
        order: { id: 'o1', status: 'CONFIRMED', createdAt: new Date('2026-05-01T10:00:00Z') },
        product: { name: 'Widget A' },
        quantity: 2,
        priceAtTime: 50, // decimal? actually Prisma returns Decimal, but mock uses number
      },
      {
        order: { id: 'o2', status: 'CANCELLED', createdAt: new Date('2026-05-02T10:00:00Z') },
        product: { name: 'Widget B' },
        quantity: 1,
        priceAtTime: 30,
      },
    ] as any);

    const ledger = await getSellerLedger('seller-1');

    // Total earned only from CONFIRMED order: 2 * 50 = 100
    expect(ledger.totalEarned).toBe(100);
    expect(ledger.commissionRate).toBe(10);
    expect(ledger.totalCommission).toBe(10); // 10% of 100
    expect(ledger.netEarnings).toBe(90);
    expect(ledger.pendingPayout).toBe(90);

    // Transactions: both orders appear, but only CONFIRMED counted in earnings
    expect(ledger.transactions).toHaveLength(2);
    expect(ledger.transactions[0].productName).toBe('Widget A');
    expect(ledger.transactions[1].productName).toBe('Widget B');
  });

  it('should default commission rate to 10 if not set', async () => {
    vi.mocked(prisma.sellerProfile.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.orderItem.findMany).mockResolvedValue([]);

    const ledger = await getSellerLedger('seller-2');
    expect(ledger.commissionRate).toBe(10);
  });

  it('should return zeros when no transactions exist', async () => {
    vi.mocked(prisma.sellerProfile.findUnique).mockResolvedValue({ commissionRate: 5 } as any);
    vi.mocked(prisma.orderItem.findMany).mockResolvedValue([]);

    const ledger = await getSellerLedger('seller-3');
    expect(ledger.totalEarned).toBe(0);
    expect(ledger.totalCommission).toBe(0);
    expect(ledger.netEarnings).toBe(0);
    expect(ledger.transactions).toHaveLength(0);
  });
});
