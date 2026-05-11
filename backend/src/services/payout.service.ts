// backend/src/services/payout.service.ts
// Business logic for seller payout requests.
import { prisma } from '../db.js';
import type { PayoutRequest, Prisma } from '@prisma/client';

/** Custom errors */
export class PayoutValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PayoutValidationError';
  }
}

/**
 * Calculate the seller's net earnings (gross from non‑cancelled orders minus commission).
 */
async function calculateNetEarnings(sellerId: string): Promise<number> {
  const profile = await prisma.sellerProfile.findUnique({
    where: { userId: sellerId },
    select: { commissionRate: true },
  });
  const commissionRate = profile?.commissionRate ? Number(profile.commissionRate) : 10;

  const items = await prisma.orderItem.findMany({
    where: {
      sellerId,
      order: { status: { notIn: ['CANCELLED', 'RETURNED'] } },
    },
    select: { priceAtTime: true, quantity: true },
  });

  let gross = 0;
  for (const item of items) {
    gross += Number(item.priceAtTime) * item.quantity;
  }

  return gross - (gross * commissionRate) / 100;
}

/**
 * Seller requests a payout. The amount must be ≤ net earnings.
 */
export async function requestPayout(sellerId: string, amount: number): Promise<PayoutRequest> {
  const netEarnings = await calculateNetEarnings(sellerId);

  if (amount > netEarnings) {
    throw new PayoutValidationError(
      `Insufficient earnings. Your available balance is $${netEarnings.toFixed(2)}.`,
    );
  }

  const pendingCount = await prisma.payoutRequest.count({
    where: { sellerId, status: 'PENDING' },
  });

  if (pendingCount > 0) {
    throw new PayoutValidationError(
      'You already have a pending payout request. Wait for it to be processed.',
    );
  }

  return prisma.payoutRequest.create({
    data: {
      sellerId,
      amount,
    },
  });
}

/**
 * Admin processes a payout request (approve/reject).
 */
export async function processPayout(
  payoutId: string,
  action: 'APPROVE' | 'REJECT',
  adminNote?: string,
): Promise<PayoutRequest> {
  const payout = await prisma.payoutRequest.findUnique({
    where: { id: payoutId },
  });

  if (!payout) {
    throw new PayoutValidationError('Payout request not found');
  }

  if (payout.status !== 'PENDING') {
    throw new PayoutValidationError(
      `Cannot process this payout because it is already ${payout.status}`,
    );
  }

  const newStatus = action === 'APPROVE' ? 'PAID' : 'REJECTED';

  return prisma.payoutRequest.update({
    where: { id: payoutId },
    data: {
      status: newStatus,
      adminNote: adminNote ?? null,
    },
  });
}

/**
 * Admin lists all payout requests with optional status filter.
 */
export async function listPayouts(status?: string): Promise<PayoutRequest[]> {
  // Build the where clause using the Prisma‑generated filter type
  const where: Prisma.PayoutRequestWhereInput = {};
  if (status) {
    where.status = status;
  }

  return prisma.payoutRequest.findMany({
    where,
    include: {
      seller: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}
