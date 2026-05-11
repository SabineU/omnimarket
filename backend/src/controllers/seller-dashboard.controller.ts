// backend/src/controllers/seller-dashboard.controller.ts
// Handles HTTP requests for the seller dashboard.
import type { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/seller-dashboard.service.js';

/** Extract authenticated seller's ID */
function getSellerId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) throw new Error('Authentication required');
  return userId;
}

/**
 * GET /api/seller/dashboard
 * Returns summary statistics for the authenticated seller.
 */
export async function getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sellerId = getSellerId(req);
    const summary = await dashboardService.getDashboardSummary(sellerId);
    res.status(200).json({
      status: 'success',
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}
