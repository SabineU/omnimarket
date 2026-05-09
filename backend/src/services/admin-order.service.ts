// backend/src/services/admin-order.service.ts
// Business logic for admin order management.
// Admins can view all orders across the entire platform.

import { prisma } from '../db.js';
import type { Order, OrderItem, Prisma } from '@prisma/client';
import type { OrderStatus } from '@omnimarket/shared';

/** Order enriched with full item details */
export interface AdminEnrichedOrder extends Order {
  items: (OrderItem & {
    product: { name: string; images: { url: string }[] };
    variation: { sku: string; size: string | null; color: string | null } | null;
    seller: { storeName: string }; // admin sees the seller name
  })[];
  customer: { name: string; email: string }; // admin sees customer info
}

/** Options for listing orders */
export interface AdminOrderListOptions {
  status?: string;
  page?: number;
  limit?: number;
}

/** Paginated result shape */
export interface PaginatedAdminOrders {
  orders: AdminEnrichedOrder[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}

/**
 * Return all orders on the platform, newest first.
 * Supports optional status filtering and pagination.
 */
export async function getAllOrders(
  options: AdminOrderListOptions = {},
): Promise<PaginatedAdminOrders> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(50, Math.max(1, options.limit ?? 10));
  const skip = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = {};
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
            seller: {
              select: { storeName: true }, // seller info for admin
            },
          },
        },
        customer: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders: orders as AdminEnrichedOrder[],
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      limit,
    },
  };
}

/**
 * Return a single order by its ID, with full details.
 * Throws a generic error if the order is not found.
 */
export async function getAdminOrderById(orderId: string): Promise<AdminEnrichedOrder> {
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
          seller: {
            select: { storeName: true },
          },
        },
      },
      customer: {
        select: { name: true, email: true },
      },
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  return order as AdminEnrichedOrder;
}
