// backend/src/controllers/impersonation.controller.ts
// Handles HTTP requests for admin impersonation.
import type { Request, Response, NextFunction } from 'express';
import * as impersonationService from '../services/impersonation.service.js';

/** Extract authenticated admin's ID */
function getAdminId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) throw new Error('Authentication required');
  return userId;
}

/**
 * POST /api/admin/impersonate
 * Body: { userId: string }
 * Returns an impersonation token for the given user.
 */
export async function impersonate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminId = getAdminId(req);
    const { userId } = req.body;
    const token = await impersonationService.impersonateUser(userId, adminId);
    res.status(201).json({
      status: 'success',
      data: { token },
    });
  } catch (error) {
    next(error);
  }
}
