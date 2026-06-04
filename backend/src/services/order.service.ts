// backend/src/services/order.service.ts
// Business logic for customer order management.
// All functions require the authenticated user's ID.
// UPDATED: markOrderDelivered now sets all items to DELIVERED and
//          recomputes the order status; uses per‑item fulfillment.

import { prisma } from '../db.js';
import type { Order, OrderItem, Prisma } from '@prisma/client';
import { FulfillmentStatus } from '@prisma/client'; // <-- NEW
import type { OrderStatus } from '@omnimarket/shared';
import { recomputeOrderStatus } from './seller-order.service.js'; // <-- NEW

/** Order enriched with items for the frontend */
export interface EnrichedOrder extends Order {
  items: (OrderItem & {
    product: { name: string; images: { url: string }[] };
    variation: { sku: string; size: string | null; color: string | null } | null;
    // fulfillmentStatus is already on OrderItem, so it appears automatically
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
          // Note: scalar fields of OrderItem (like fulfillmentStatus) are included automatically
          // when using `include` on a relation, unless a `select` overrides it.
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

  const updatedOrder = await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      if (item.variationId) {
        await tx.productVariation.update({
          where: { id: item.variationId },
          data: { stockQty: { increment: item.quantity } },
        });
      }
    }

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

/**
 * Mark an order as DELIVERED (customer confirms receipt).
 * Only the customer who owns the order can perform this action.
 * The order must be in SHIPPED or PARTIALLY_SHIPPED status.
 * Sets all items to DELIVERED and recomputes the order status.
 */
export async function markOrderDelivered(orderId: string, userId: string): Promise<EnrichedOrder> {
  // 1. Fetch the order and verify ownership + eligible status
  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order || order.customerId !== userId) {
    throw new Error('Order not found');
  }

  if (order.status !== 'SHIPPED' && order.status !== 'PARTIALLY_SHIPPED') {
    throw new Error(
      `Order cannot be marked as delivered because it is ${order.status}. Only shipped orders can be delivered.`,
    );
  }

  // 2. Set all items to DELIVERED
  await prisma.orderItem.updateMany({
    where: { orderId },
    data: { fulfillmentStatus: FulfillmentStatus.DELIVERED },
  });

  // 3. Recompute the overall order status (will become DELIVERED)
  await recomputeOrderStatus(orderId);

  // 4. Fetch the updated order with enriched items
  const updatedOrder = await prisma.order.findUnique({
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

  if (!updatedOrder) {
    throw new Error('Order not found after update');
  }

  return updatedOrder as EnrichedOrder;
}
