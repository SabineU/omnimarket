// backend/src/services/admin-order.service.ts
// Business logic for admin order management.
// Admins can view all orders (summary list) and single order details.
// FIXED: removed invalid `seller` include from OrderItem.

import { prisma } from '../db.js';
import type { Order, OrderItem, Prisma } from '@prisma/client';
import type { OrderStatus } from '@omnimarket/shared';

// ---------------------------------------------------------------------------
// Types for the summary list (no heavy item details)
// ---------------------------------------------------------------------------

/** Order summary returned by the admin list endpoint */
export interface AdminOrderSummary {
  id: string;
  customer: { name: string; email: string };
  status: string;
  totalAmount: string;
  createdAt: string;
}

/** Paginated wrapper for the list */
export interface PaginatedAdminOrderSummaries {
  orders: AdminOrderSummary[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}

// ---------------------------------------------------------------------------
// Types for the detail endpoint (full order with items, no seller on items)
// ---------------------------------------------------------------------------

/** Order enriched with full item details – NO `seller` field on items */
export interface AdminEnrichedOrder extends Order {
  items: (OrderItem & {
    product: { name: string; images: { url: string }[] };
    variation: { sku: string; size: string | null; color: string | null } | null;
    // seller field removed because OrderItem has no seller relation
  })[];
  customer: { name: string; email: string };
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface AdminOrderListOptions {
  status?: string;
  page?: number;
  limit?: number;
}

// =============================================================================
// Public functions
// =============================================================================

/**
 * Return a paginated list of all orders (summary only – lightweight).
 * Supports optional status filtering and pagination.
 */
export async function getAllOrders(
  options: AdminOrderListOptions = {},
): Promise<PaginatedAdminOrderSummaries> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(50, Math.max(1, options.limit ?? 10));
  const skip = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = {};
  if (options.status) {
    where.status = options.status as OrderStatus;
  }

  // Fetch only the fields needed for the table – no items included.
  const [orders, totalItems] = await Promise.all([
    prisma.order.findMany({
      where,
      select: {
        id: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        customer: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.order.count({ where }),
  ]);

  // Convert Decimal totalAmount to string for safe JSON serialization
  const summaries: AdminOrderSummary[] = orders.map((o) => ({
    id: o.id,
    customer: o.customer,
    status: o.status,
    totalAmount: String(o.totalAmount),
    createdAt: o.createdAt.toISOString(),
  }));

  return {
    orders: summaries,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      limit,
    },
  };
}

/**
 * Return a single order by its ID, with full item details.
 * Throws if the order is not found.
 * NOTE: seller info per item is NOT included because OrderItem has no seller relation.
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
          // seller relation does not exist on OrderItem – removed
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
