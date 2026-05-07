// backend/src/services/order.service.ts
// Business logic for customer order management.
// All functions require the authenticated user's ID.

import { prisma } from '../db.js';
import type { Order, OrderItem, Prisma } from '@prisma/client';
import type { OrderStatus } from '@omnimarket/shared';

/** Order enriched with items for the frontend */
export interface EnrichedOrder extends Order {
  items: (OrderItem & {
    product: { name: string; images: { url: string }[] };
    variation: { sku: string; size: string | null; color: string | null } | null;
  })[];
}

/** Options for listing orders */
export interface OrderListOptions {
  status?: string;
  page?: number;
  limit?: number;
}

/** Paginated result shape */
export interface PaginatedOrders {
  orders: EnrichedOrder[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}

/** Custom error for cancellation failures */
export class OrderCancellationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderCancellationError';
  }
}

/**
 * Return all orders belonging to the given user, newest first.
 */
export async function getUserOrders(
  userId: string,
  options: OrderListOptions = {},
): Promise<PaginatedOrders> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(50, Math.max(1, options.limit ?? 10));
  const skip = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = { customerId: userId };
  if (options.status) {
    where.status = options.status as OrderStatus;
  }

  const [orders, totalItems] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: {
              select: { name: true, images: { select: { url: true }, take: 1 } },
            },
            variation: {
              select: { sku: true, size: true, color: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders: orders as EnrichedOrder[],
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      limit,
    },
  };
}

/**
 * Return a single order by its ID, ensuring it belongs to the given user.
 */
export async function getOrderById(orderId: string, userId: string): Promise<EnrichedOrder> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: { name: true, images: { select: { url: true }, take: 1 } },
          },
          variation: {
            select: { sku: true, size: true, color: true },
          },
        },
      },
    },
  });

  if (!order || order.customerId !== userId) {
    throw new Error('Order not found');
  }

  return order as EnrichedOrder;
}

/**
 * Cancel an order that belongs to the user, if it is still in a cancellable state.
 * Cancellable statuses: PENDING, CONFIRMED (before shipping).
 * Restores stock for each order item that has a variation.
 * Runs in a database transaction to guarantee atomicity.
 */
export async function cancelOrder(orderId: string, userId: string): Promise<EnrichedOrder> {
  // 1. Fetch the order and verify ownership + cancellable status
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order || order.customerId !== userId) {
    throw new OrderCancellationError('Order not found');
  }

  const cancellableStatuses: string[] = ['PENDING', 'CONFIRMED'];
  if (!cancellableStatuses.includes(order.status)) {
    throw new OrderCancellationError(`Order cannot be cancelled because it is ${order.status}`);
  }

  // 2. Perform cancellation in a transaction
  const updatedOrder = await prisma.$transaction(async (tx) => {
    // Restore stock for each item with a variation
    for (const item of order.items) {
      if (item.variationId) {
        await tx.productVariation.update({
          where: { id: item.variationId },
          data: { stockQty: { increment: item.quantity } },
        });
      }
    }

    // Change order status to CANCELLED
    const cancelled = await tx.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
      include: {
        items: {
          include: {
            product: {
              select: { name: true, images: { select: { url: true }, take: 1 } },
            },
            variation: {
              select: { sku: true, size: true, color: true },
            },
          },
        },
      },
    });

    return cancelled;
  });

  return updatedOrder as EnrichedOrder;
}
