// backend/src/routes/review.routes.ts
// Product review routes – creation requires authentication, listing is public.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { reviewSchema } from '@omnimarket/shared';
import * as reviewController from '../controllers/review.controller.js';

const router = Router();

// GET /api/products/:productId/reviews – public, no authentication
router.get('/:productId/reviews', reviewController.listReviews);

// POST /api/products/:productId/reviews – requires authentication
router.post(
  '/:productId/reviews',
  authenticate,
  validate(reviewSchema),
  reviewController.createReview,
);

export default router;
