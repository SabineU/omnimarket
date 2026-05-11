// backend/src/controllers/seller-ledger.controller.ts
// Handles HTTP requests for the seller ledger.
import type { Request, Response, NextFunction } from 'express';
import * as ledgerService from '../services/seller-ledger.service.js';

/** Extract authenticated seller's ID */
function getSellerId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) throw new Error('Authentication required');
  return userId;
}

/**
 * GET /api/seller/ledger
 */
export async function getLedger(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sellerId = getSellerId(req);
    const ledger = await ledgerService.getSellerLedger(sellerId);
    res.status(200).json({
      status: 'success',
      data: ledger,
    });
  } catch (error) {
    next(error);
  }
}
