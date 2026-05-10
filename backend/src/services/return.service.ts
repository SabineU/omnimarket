// backend/src/services/return.service.ts
// Business logic for return / refund flow.
import { prisma } from '../db.js';
import type { Order } from '@prisma/client';

/** Custom errors */
export class ReturnRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReturnRequestError';
  }
}

export class RefundProcessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RefundProcessError';
  }
}

/**
 * Customer requests a return for a delivered order.
 * Only the customer who owns the order can request.
 * The order must be in DELIVERED status.
 */
export async function requestReturn(
  orderId: string,
  userId: string,
  _reason?: string, // <-- prefixed with underscore (not yet stored in DB)
): Promise<Order> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order || order.customerId !== userId) {
    throw new ReturnRequestError('Order not found');
  }

  if (order.status !== 'DELIVERED') {
    throw new ReturnRequestError(
      `Cannot request return because order is ${order.status}. Only delivered orders can be returned.`,
    );
  }

  // Update status to RETURN_REQUESTED
  return prisma.order.update({
    where: { id: orderId },
    data: { status: 'RETURN_REQUESTED' },
  });
}

/**
 * Admin processes a return request (approve or reject).
 * The order must be in RETURN_REQUESTED status.
 */
export async function processRefund(
  orderId: string,
  action: 'APPROVE' | 'REJECT',
  _reason?: string, // <-- prefixed with underscore (not yet stored in DB)
): Promise<Order> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });

  if (!order) {
    throw new RefundProcessError('Order not found');
  }

  if (order.status !== 'RETURN_REQUESTED') {
    throw new RefundProcessError(
      `Cannot process refund because order is ${order.status}. Only return‑requested orders can be processed.`,
    );
  }

  const newStatus = action === 'APPROVE' ? 'RETURNED' : 'DELIVERED';

  return prisma.order.update({
    where: { id: orderId },
    data: { status: newStatus },
  });
}
