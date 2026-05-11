// backend/src/controllers/seller-review.controller.ts
// Handles HTTP requests for the seller review dashboard.
import type { Request, Response, NextFunction } from 'express';
import * as sellerReviewService from '../services/seller-review.service.js';

/** Extract authenticated seller's ID */
function getSellerId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) throw new Error('Authentication required');
  return userId;
}

/**
 * GET /api/seller/reviews
 * Optional query: ?page=1&limit=10
 */
export async function listReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sellerId = getSellerId(req);
    const options = {
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };

    const result = await sellerReviewService.getSellerReviews(sellerId, options);
    res.status(200).json({
      status: 'success',
      data: {
        reviews: result.reviews,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
}
