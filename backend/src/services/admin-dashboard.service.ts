// backend/src/services/admin-dashboard.service.ts
// Business logic for the admin dashboard – platform‑wide statistics.
import { prisma } from '../db.js';

/** Shape of the dashboard response */
export interface AdminDashboardStats {
  totalRevenue: number; // sum of all non‑cancelled/returned orders
  totalOrders: number; // total number of orders
  totalCustomers: number; // users with role CUSTOMER
  totalSellers: number; // users with role SELLER
  totalProducts: number; // all products regardless of status
  recentOrders: {
    id: string;
    customerName: string;
    totalAmount: number;
    status: string;
    createdAt: string;
  }[];
}

/**
 * Gather platform‑wide statistics for the admin dashboard.
 */
export async function getAdminDashboard(): Promise<AdminDashboardStats> {
  // 1. Total revenue – sum of totalAmount for orders that are not cancelled/returned
  const revenueAgg = await prisma.order.aggregate({
    where: {
      status: { notIn: ['CANCELLED', 'RETURNED'] },
    },
    _sum: { totalAmount: true },
  });
  const totalRevenue = Number(revenueAgg._sum.totalAmount ?? 0);

  // 2. Total orders – all orders
  const totalOrders = await prisma.order.count();

  // 3. Total customers
  const totalCustomers = await prisma.user.count({
    where: { role: 'CUSTOMER' },
  });

  // 4. Total sellers
  const totalSellers = await prisma.user.count({
    where: { role: 'SELLER' },
  });

  // 5. Total products
  const totalProducts = await prisma.product.count();

  // 6. Recent orders – last 5 orders with customer name
  const recentOrders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      totalAmount: true,
      status: true,
      createdAt: true,
      customer: { select: { name: true } },
    },
  });

  return {
    totalRevenue,
    totalOrders,
    totalCustomers,
    totalSellers,
    totalProducts,
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      customerName: o.customer.name,
      totalAmount: Number(o.totalAmount),
      status: o.status,
      createdAt: o.createdAt.toISOString(),
    })),
  };
}
