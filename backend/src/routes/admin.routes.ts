// backend/src/routes/admin.routes.ts
// Admin routes – restricted to ADMIN role.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { adminApproveSellerSchema, UserRole } from '@omnimarket/shared';
import * as adminController from '../controllers/admin.controller.js';

const router = Router();

// Protect every route with authentication and ADMIN role
router.use(authenticate);
router.use(authorize(UserRole.ADMIN)); // 'ADMIN' – exact value from the database

// PATCH /api/admin/sellers/:userId – approve or reject a seller
router.patch('/sellers/:userId', validate(adminApproveSellerSchema), adminController.approveSeller);

export default router;
