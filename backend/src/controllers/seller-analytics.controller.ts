// backend/src/controllers/seller-analytics.controller.ts
// Handles HTTP requests for seller analytics.
import type { Request, Response, NextFunction } from 'express';
import * as analyticsService from '../services/seller-analytics.service.js';

/** Extract authenticated seller's ID */
function getSellerId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) throw new Error('Authentication required');
  return userId;
}

/**
 * GET /api/seller/analytics/sales
 * Optional query: ?start=2026-04-01&end=2026-05-01
 */
export async function getSalesAnalytics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sellerId = getSellerId(req);
    const options: analyticsService.SalesAnalyticsOptions = {
      start: req.query.start as string | undefined,
      end: req.query.end as string | undefined,
    };

    const sales = await analyticsService.getSalesAnalytics(sellerId, options);
    res.status(200).json({
      status: 'success',
      data: { sales },
    });
  } catch (error) {
    next(error);
  }
}
