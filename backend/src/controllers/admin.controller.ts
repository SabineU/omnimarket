// backend/src/controllers/admin.controller.ts
// Handles HTTP requests for admin operations.
import type { Request, Response, NextFunction } from 'express';
import * as adminService from '../services/admin.service.js';

/** Helper to safely extract a single route parameter */
function getParam(req: Request, name: string): string {
  const value = req.params[name];
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

/**
 * PATCH /api/admin/sellers/:userId
 * Approve or reject a seller.
 * Body: { isApproved: boolean }
 */
export async function approveSeller(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getParam(req, 'userId');
    const { isApproved } = req.body;
    const profile = await adminService.approveSeller(userId, isApproved);
    res.status(200).json({
      status: 'success',
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
}
