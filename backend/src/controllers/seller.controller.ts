// backend/src/controllers/seller.controller.ts
// Handles HTTP requests for seller profile management.
import type { Request, Response, NextFunction } from 'express';
import * as sellerService from '../services/seller.service.js';

/** Helper to get the authenticated user's ID */
function getUserId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new Error('Authentication required – req.user is missing');
  }
  return userId;
}

/**
 * GET /api/seller/profile
 * Returns the seller profile of the currently authenticated seller.
 */
export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const profile = await sellerService.getSellerProfile(userId);
    res.status(200).json({
      status: 'success',
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/seller/profile
 * Creates or updates the seller profile of the authenticated seller.
 */
export async function upsertProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getUserId(req);
    const profile = await sellerService.upsertSellerProfile(userId, req.body);
    res.status(200).json({
      status: 'success',
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
}
