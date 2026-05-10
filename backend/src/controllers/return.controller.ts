// backend/src/controllers/return.controller.ts
import type { Request, Response, NextFunction } from 'express';
import * as returnService from '../services/return.service.js';

/** Extract authenticated user's ID */
function getUserId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) throw new Error('Authentication required');
  return userId;
}

/** Extract a single route parameter safely */
function getParam(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

/**
 * POST /api/orders/:id/request-return
 * Customer requests a return.
 */
export async function requestReturn(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const orderId = getParam(req, 'id');
    const { reason } = req.body;
    const order = await returnService.requestReturn(orderId, userId, reason);
    res.status(200).json({
      status: 'success',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/orders/:id/refund
 * Admin approves or rejects a return.
 */
export async function processRefund(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const orderId = getParam(req, 'id');
    const { action, reason } = req.body;
    const order = await returnService.processRefund(orderId, action, reason);
    res.status(200).json({
      status: 'success',
      data: { order },
    });
  } catch (error) {
    next(error);
  }
}
