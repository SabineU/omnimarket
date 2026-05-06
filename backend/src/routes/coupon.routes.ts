// backend/src/routes/coupon.routes.ts
// Coupon routes – all require authentication.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { validateCouponSchema } from '@omnimarket/shared';
import * as couponController from '../controllers/coupon.controller.js';

const router = Router();

router.use(authenticate);

// POST /api/cart/validate-coupon
router.post('/validate-coupon', validate(validateCouponSchema), couponController.validateCoupon);

export default router;
