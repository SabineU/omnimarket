// backend/src/services/seller-analytics.service.ts
// Business logic for seller sales analytics.
import { prisma } from '../db.js';

/** A single data point for the sales chart */
export interface SalesDataPoint {
  date: string; // 'YYYY-MM-DD'
  sales: number;
}

/** Options for the analytics query */
export interface SalesAnalyticsOptions {
  start?: string; // ISO date string
  end?: string; // ISO date string
}

/**
 * Return daily sales totals for a seller's products within a date range.
 * If no range is provided, defaults to the last 30 days.
 */
export async function getSalesAnalytics(
  sellerId: string,
  options: SalesAnalyticsOptions = {},
): Promise<SalesDataPoint[]> {
  // 1. Determine the date range
  const endDate = options.end ? new Date(options.end) : new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = options.start ? new Date(options.start) : new Date(endDate);
  if (!options.start) {
    startDate.setDate(startDate.getDate() - 29); // last 30 days including today
  }
  startDate.setHours(0, 0, 0, 0);

  // 2. Fetch orders that contain the seller's items within the date range
  const orders = await prisma.order.findMany({
    where: {
      items: { some: { sellerId } },
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      totalAmount: true,
      createdAt: true,
    },
  });

  // 3. Build a map of date → total sales
  const salesMap = new Map<string, number>();

  // Initialise every day in the range with 0
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
    salesMap.set(key, 0);
  }

  // Accumulate order totals into the map by date
  for (const order of orders) {
    const key = order.createdAt.toISOString().slice(0, 10);
    const current = salesMap.get(key) ?? 0;
    salesMap.set(key, current + Number(order.totalAmount));
  }

  // 4. Convert the map to an array of { date, sales }, sorted by date
  const result: SalesDataPoint[] = [];
  for (const [date, sales] of salesMap) {
    result.push({ date, sales });
  }
  result.sort((a, b) => a.date.localeCompare(b.date));

  return result;
}
