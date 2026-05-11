// backend/src/routes/coupon-admin.routes.ts
// Admin coupon management – restricted to ADMIN role.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { couponAdminCreateSchema, couponAdminUpdateSchema } from '@omnimarket/shared';
import * as couponAdminController from '../controllers/coupon-admin.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

// POST /api/admin/coupons
router.post('/', validate(couponAdminCreateSchema), couponAdminController.createCoupon);

// GET /api/admin/coupons
router.get('/', couponAdminController.listCoupons);

// PUT /api/admin/coupons/:id
router.put('/:id', validate(couponAdminUpdateSchema), couponAdminController.updateCoupon);

// DELETE /api/admin/coupons/:id
router.delete('/:id', couponAdminController.deleteCoupon);

export default router;
