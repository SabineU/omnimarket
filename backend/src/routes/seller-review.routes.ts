// backend/src/routes/seller-review.routes.ts
// Seller review dashboard – restricted to SELLER role.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import * as sellerReviewController from '../controllers/seller-review.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize('SELLER'));

// GET /api/seller/reviews
router.get('/', sellerReviewController.listReviews);

export default router;
