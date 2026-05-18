// backend/src/routes/review.routes.ts
// Product review routes – creation requires authentication, listing is public.
// Now includes an additional‑review endpoint that allows multiple reviews
// per product per customer.
import { Router, type Request, type Response } from 'express';
import { Prisma } from '@prisma/client'; // <-- added
import prisma from '../lib/prisma.js';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { reviewSchema } from '@omnimarket/shared';
import * as reviewController from '../controllers/review.controller.js';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/products/:productId/reviews – public, no authentication
// ---------------------------------------------------------------------------
router.get('/:productId/reviews', reviewController.listReviews);

// ---------------------------------------------------------------------------
// POST /api/products/:productId/reviews – first review (requires auth)
// Enforces the unique constraint: one review per product per customer.
// ---------------------------------------------------------------------------
router.post(
  '/:productId/reviews',
  authenticate,
  validate(reviewSchema),
  reviewController.createReview,
);

// ---------------------------------------------------------------------------
// POST /api/products/:productId/reviews/additional – extra review
// Same as the standard review, but WITHOUT the unique‑constraint check.
// This allows customers to add more details after their initial review.
// ---------------------------------------------------------------------------
router.post('/:productId/reviews/additional', authenticate, async (req: Request, res: Response) => {
  try {
    const productId = req.params.productId as string;
    const { rating, comment } = req.body;
    const userId = req.user?.userId;

    // ---- Authentication guard ----
    if (!userId) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required.',
      });
      return;
    }

    // ---- Basic validation ----
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      res.status(400).json({
        status: 'error',
        message: 'Rating must be a number between 1 and 5.',
      });
      return;
    }

    // ---- Verify the product exists ----
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      res.status(404).json({
        status: 'error',
        message: 'Product not found.',
      });
      return;
    }

    // ---- Create the additional review ----
    const review = await prisma.review.create({
      data: {
        productId,
        customerId: userId,
        rating,
        comment: comment || null,
      },
      select: {
        id: true,
        productId: true,
        customerId: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      status: 'success',
      data: { review },
    });
  } catch (err) {
    // ---- Handle known Prisma errors ----
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002 = unique constraint violation
      if (err.code === 'P2002') {
        res.status(409).json({
          status: 'error',
          message: 'You have already reviewed this product.',
        });
        return;
      }
      // P2003 = foreign key constraint (e.g., product doesn't exist, but we check)
      if (err.code === 'P2003') {
        res.status(400).json({
          status: 'error',
          message: 'Invalid product or customer reference.',
        });
        return;
      }
    }

    // ---- Log unexpected errors ----
    console.error('Additional review error:', err);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error.',
    });
  }
});

export default router;
