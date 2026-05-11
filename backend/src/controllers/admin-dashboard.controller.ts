// backend/src/controllers/admin-dashboard.controller.ts
// Handles HTTP requests for the admin dashboard.
import type { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/admin-dashboard.service.js';

/**
 * GET /api/admin/dashboard/stats
 * Returns platform‑wide summary statistics.
 */
export async function getStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await dashboardService.getAdminDashboard();
    res.status(200).json({
      status: 'success',
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}
