// backend/src/routes/review.routes.ts
// Product review routes – require authentication.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { reviewSchema } from '@omnimarket/shared';
import * as reviewController from '../controllers/review.controller.js';

const router = Router();

router.use(authenticate);

// POST /api/products/:productId/reviews
router.post('/:productId/reviews', validate(reviewSchema), reviewController.createReview);

export default router;
