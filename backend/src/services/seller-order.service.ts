// backend/src/services/seller-order.service.ts
// Business logic for seller order management.
// UPDATED: sellers update fulfillmentStatus on their items;
//          custom error for invalid status transitions.
import { prisma } from '../db.js';
import type { Order, OrderItem, Prisma } from '@prisma/client';
import type { OrderStatus as PrismaOrderStatus } from '@prisma/client';
import type { FulfillmentStatus } from '@prisma/client';
import type { OrderStatus } from '@omnimarket/shared';

// ---------------------------------------------------------------------------
// Custom Errors
// ---------------------------------------------------------------------------

export class OrderStatusTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrderStatusTransitionError';
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SellerEnrichedOrder extends Order {
  customer?: { name: string; email: string };
  items: (OrderItem & {
    product: { name: string; images: { url: string }[] };
    variation: { sku: string; size: string | null; color: string | null } | null;
  })[];
}

export interface SellerOrderListOptions {
  status?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedSellerOrders {
  orders: SellerEnrichedOrder[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}

// ---------------------------------------------------------------------------
// Helper: recompute the overall order status after an item update
// ---------------------------------------------------------------------------

export async function recomputeOrderStatus(orderId: string): Promise<void> {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: { fulfillmentStatus: true },
  });

  const statuses = items.map((i) => i.fulfillmentStatus);

  let newStatus: OrderStatus;

  if (statuses.every((s) => s === 'DELIVERED')) {
    newStatus = 'DELIVERED';
  } else if (statuses.every((s) => s === 'SHIPPED' || s === 'DELIVERED')) {
    newStatus = 'SHIPPED';
  } else if (statuses.some((s) => s === 'SHIPPED' || s === 'DELIVERED')) {
    newStatus = 'PARTIALLY_SHIPPED';
  } else {
    newStatus = 'CONFIRMED';
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status: newStatus as PrismaOrderStatus },
  });
}

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

export async function getSellerOrders(
  sellerId: string,
  options: SellerOrderListOptions = {},
): Promise<PaginatedSellerOrders> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(50, Math.max(1, options.limit ?? 10));
  const skip = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = {
    items: { some: { sellerId } },
  };
  if (options.status) {
    where.status = options.status as PrismaOrderStatus;
  }

  const [orders, totalItems] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        customer: { select: { name: true, email: true } },
        items: {
          where: { sellerId },
          include: {
            product: { select: { name: true, images: { select: { url: true }, take: 1 } } },
            variation: { select: { sku: true, size: true, color: true } },
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
    orders: orders as SellerEnrichedOrder[],
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      limit,
    },
  };
}

export async function getSellerOrderById(
  orderId: string,
  sellerId: string,
): Promise<SellerEnrichedOrder> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { name: true, email: true } },
      items: {
        where: { sellerId },
        include: {
          product: { select: { name: true, images: { select: { url: true }, take: 1 } } },
          variation: { select: { sku: true, size: true, color: true } },
        },
      },
    },
  });

  if (!order || order.items.length === 0) {
    throw new Error('Order not found');
  }

  return order as SellerEnrichedOrder;
}

export async function updateOrderStatus(
  sellerId: string,
  orderId: string,
  newStatus: string,
): Promise<SellerEnrichedOrder> {
  const items = await prisma.orderItem.findMany({
    where: { orderId, sellerId },
    select: { id: true, fulfillmentStatus: true },
  });

  if (items.length === 0) {
    throw new Error('Order not found');
  }

  const allowedTransitions: Record<string, string[]> = {
    PENDING: ['CONFIRMED'],
    CONFIRMED: ['SHIPPED'],
  };

  for (const item of items) {
    const allowed = allowedTransitions[item.fulfillmentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new OrderStatusTransitionError(
        `Cannot move item from ${item.fulfillmentStatus} to ${newStatus}`,
      );
    }
  }

  await prisma.orderItem.updateMany({
    where: { orderId, sellerId },
    data: { fulfillmentStatus: newStatus as FulfillmentStatus },
  });

  await recomputeOrderStatus(orderId);

  return getSellerOrderById(orderId, sellerId);
}
