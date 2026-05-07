// backend/src/services/order.service.ts
// Business logic for customer order management.
// All functions require the authenticated user's ID.

import { prisma } from '../db.js';
import type { Order, OrderItem, Prisma } from '@prisma/client';
import type { OrderStatus } from '@omnimarket/shared'; // <-- fixed: import type only

/** Order enriched with items for the frontend */
export interface EnrichedOrder extends Order {
  items: (OrderItem & {
    product: { name: string; images: { url: string }[] };
    variation: { sku: string; size: string | null; color: string | null } | null;
  })[];
}

/** Options for listing orders */
export interface OrderListOptions {
  status?: string; // ORDER_STATUS enum value (e.g., CONFIRMED, SHIPPED)
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

/**
 * Return all orders belonging to the given user, newest first.
 * Supports optional status filtering and pagination.
 */
export async function getUserOrders(
  userId: string,
  options: OrderListOptions = {},
): Promise<PaginatedOrders> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(50, Math.max(1, options.limit ?? 10));
  const skip = (page - 1) * limit;

  // Build the where clause with the correct Prisma type
  const where: Prisma.OrderWhereInput = { customerId: userId };
  if (options.status) {
    // The shared enum values match the database enums, so the cast is safe
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
 * Throws a generic error if the order is not found or doesn't belong to the user.
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
