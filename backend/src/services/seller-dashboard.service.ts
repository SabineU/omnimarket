// backend/src/services/seller-dashboard.service.ts
// Business logic for the seller dashboard summary.
import { prisma } from '../db.js';

/** Shape of the dashboard response */
export interface SellerDashboardSummary {
  todaySales: number;
  pendingOrders: number;
  totalProducts: number;
  totalReviews: number;
  averageRating: number;
}

/**
 * Compute and return dashboard statistics for a specific seller.
 * @param sellerId – the authenticated seller's ID
 */
export async function getDashboardSummary(sellerId: string): Promise<SellerDashboardSummary> {
  // Define the filter for orders that contain the seller's items
  const orderWhere = {
    items: { some: { sellerId } },
  };

  // 1. Today's sales – sum of totalAmount for orders created today
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const todaySalesAgg = await prisma.order.aggregate({
    where: {
      ...orderWhere,
      createdAt: { gte: startOfToday, lte: endOfToday },
    },
    _sum: { totalAmount: true },
  });
  const todaySales = Number(todaySalesAgg._sum.totalAmount ?? 0);

  // 2. Pending orders – count of orders with status PENDING containing seller's items
  const pendingOrders = await prisma.order.count({
    where: {
      ...orderWhere,
      status: 'PENDING',
    },
  });

  // 3. Total products listed by the seller
  const totalProducts = await prisma.product.count({
    where: { sellerId },
  });

  // 4. Total reviews for the seller's products
  const reviewsAgg = await prisma.review.aggregate({
    where: {
      product: { sellerId },
    },
    _count: { id: true },
    _avg: { rating: true },
  });

  const totalReviews = reviewsAgg._count.id ?? 0;
  const averageRating = reviewsAgg._avg.rating ?? 0;

  return {
    todaySales,
    pendingOrders,
    totalProducts,
    totalReviews,
    averageRating,
  };
}
