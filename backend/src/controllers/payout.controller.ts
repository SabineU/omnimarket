// backend/src/controllers/payout.controller.ts
import type { Request, Response, NextFunction } from 'express';
import * as payoutService from '../services/payout.service.js';

/** Helper to extract seller ID */
function getSellerId(req: Request): string {
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
 * POST /api/seller/payouts
 * Seller requests a payout.
 */
export async function requestPayout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sellerId = getSellerId(req);
    const { amount } = req.body;
    const payout = await payoutService.requestPayout(sellerId, amount);
    res.status(201).json({ status: 'success', data: { payout } });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/payouts/:id
 * Admin processes a payout (approve/reject).
 */
export async function processPayout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const payoutId = getParam(req, 'id');
    const { action, adminNote } = req.body;
    const payout = await payoutService.processPayout(payoutId, action, adminNote);
    res.status(200).json({ status: 'success', data: { payout } });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/payouts
 * Admin lists payout requests.
 */
export async function listPayouts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = req.query.status as string | undefined;
    const payouts = await payoutService.listPayouts(status);
    res.status(200).json({ status: 'success', data: { payouts } });
  } catch (error) {
    next(error);
  }
}
