// backend/src/controllers/review.controller.ts
// Handles HTTP requests for product reviews.
import type { Request, Response, NextFunction } from 'express';
import * as reviewService from '../services/review.service.js';

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
 * POST /api/products/:productId/reviews
 * Body: { rating: number, comment?: string }
 */
export async function createReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getUserId(req);
    const productId = getParam(req, 'productId');
    const { rating, comment } = req.body;
    const result = await reviewService.createReview(userId, productId, rating, comment);
    res.status(201).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
