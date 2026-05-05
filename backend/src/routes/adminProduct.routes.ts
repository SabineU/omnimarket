// backend/src/routes/adminProduct.routes.ts
// Admin product moderation routes – restricted to ADMIN role.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { adminProductStatusSchema } from '@omnimarket/shared';
import * as adminController from '../controllers/admin.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

// GET /api/admin/products
router.get('/', adminController.getAllProducts);

// PATCH /api/admin/products/:id/status
router.patch(
  '/:id/status',
  validate(adminProductStatusSchema),
  adminController.updateProductStatus,
);

export default router;
