// backend/src/services/seller-order.service.ts
// Business logic for seller order management.
// All functions require the authenticated seller's ID.

import { prisma } from '../db.js';
import type { Order, OrderItem, Prisma } from '@prisma/client';
import type { OrderStatus } from '@omnimarket/shared';

/** Order enriched with items (seller‑filtered) */
export interface SellerEnrichedOrder extends Order {
  items: (OrderItem & {
    product: { name: string; images: { url: string }[] };
    variation: { sku: string; size: string | null; color: string | null } | null;
  })[];
}

/** Options for listing orders */
export interface SellerOrderListOptions {
  status?: string; // filter by order status
  page?: number;
  limit?: number;
}

/** Paginated result shape */
export interface PaginatedSellerOrders {
  orders: SellerEnrichedOrder[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}

/**
 * Return all orders that contain items belonging to the given seller.
 * Only the seller's items are included in the response.
 */
export async function getSellerOrders(
  sellerId: string,
  options: SellerOrderListOptions = {},
): Promise<PaginatedSellerOrders> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(50, Math.max(1, options.limit ?? 10));
  const skip = (page - 1) * limit;

  // Build the where clause: find orders with at least one item belonging to the seller
  const where: Prisma.OrderWhereInput = {
    items: {
      some: { sellerId },
    },
  };
  if (options.status) {
    where.status = options.status as OrderStatus;
  }

  const [orders, totalItems] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        items: {
          where: { sellerId }, // only include the seller's own items
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
      items: {
        where: { sellerId }, // filter to seller's items
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

  if (!order || order.items.length === 0) {
    throw new Error('Order not found');
  }

  return order as SellerEnrichedOrder;
}
