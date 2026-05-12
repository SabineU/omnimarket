// backend/src/routes/impersonation.routes.ts
// Admin impersonation route – restricted to ADMIN role.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { adminImpersonateSchema } from '@omnimarket/shared';
import * as impersonationController from '../controllers/impersonation.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

// POST /api/admin/impersonate
router.post('/', validate(adminImpersonateSchema), impersonationController.impersonate);

export default router;
