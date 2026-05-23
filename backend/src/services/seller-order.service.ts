// backend/src/services/seller-order.service.ts
// Business logic for seller order management.
// All functions require the authenticated seller's ID.
// FIXED: now includes customer name/email so the seller portal can display them.

import { prisma } from '../db.js';
import type { Order, OrderItem, Prisma } from '@prisma/client';
import type { OrderStatus as PrismaOrderStatus } from '@prisma/client';
import type { OrderStatus } from '@omnimarket/shared';

/** Order enriched with items (seller‑filtered) and customer info */
export interface SellerEnrichedOrder extends Order {
  customer?: { name: string; email: string }; // <-- added
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
// Public Functions
// ---------------------------------------------------------------------------

/**
 * Return all orders that contain items belonging to the given seller.
 * Only the seller's items are included, plus the customer's name & email.
 */
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
    where.status = options.status as OrderStatus;
  }

  const [orders, totalItems] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        customer: {
          // <-- added
          select: { name: true, email: true },
        },
        items: {
          where: { sellerId },
          include: {
            product: {
              select: { name: true, images: { select: { url: true }, take: 1 } },
            },
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

/**
 * Return a single order by its ID, but only include items that belong to the seller.
 * Throws if the order does not exist or does not contain the seller's items.
 */
export async function getSellerOrderById(
  orderId: string,
  sellerId: string,
): Promise<SellerEnrichedOrder> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: {
        // <-- added
        select: { name: true, email: true },
      },
      items: {
        where: { sellerId },
        include: {
          product: {
            select: { name: true, images: { select: { url: true }, take: 1 } },
          },
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

/**
 * Update the status of an order on behalf of a seller.
 * (unchanged – already works correctly)
 */
export async function updateOrderStatus(
  sellerId: string,
  orderId: string,
  newStatus: string,
): Promise<SellerEnrichedOrder> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) throw new Error('Order not found');

  const sellerItemExists = order.items.some((item) => item.sellerId === sellerId);
  if (!sellerItemExists) throw new Error('Order not found');

  const allowedTransitions: Record<string, string[]> = {
    PENDING: ['CONFIRMED'],
    CONFIRMED: ['SHIPPED'],
  };

  const allowed = allowedTransitions[order.status];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new Error(`Cannot move order from ${order.status} to ${newStatus}`);
  }

  const updated = await prisma.order.update({
    where: { id: orderId },
    data: { status: newStatus as PrismaOrderStatus },
    include: {
      customer: { select: { name: true, email: true } }, // <-- added
      items: {
        where: { sellerId },
        include: {
          product: {
            select: { name: true, images: { select: { url: true }, take: 1 } },
          },
          variation: { select: { sku: true, size: true, color: true } },
        },
      },
    },
  });

  return updated as SellerEnrichedOrder;
}
