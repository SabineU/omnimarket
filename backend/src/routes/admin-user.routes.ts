// backend/src/routes/admin-user.routes.ts
// Admin user management routes – restricted to ADMIN role.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { adminUserActiveSchema } from '@omnimarket/shared';
import * as adminUserController from '../controllers/admin-user.controller.js';

const router = Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

// GET /api/admin/users
router.get('/', adminUserController.listUsers);

// GET /api/admin/users/:id
router.get('/:id', adminUserController.getUser);

// PATCH /api/admin/users/:id/active-status
router.patch(
  '/:id/active-status',
  validate(adminUserActiveSchema),
  adminUserController.toggleActiveStatus,
);

// DELETE /api/admin/users/:id
router.delete('/:id', adminUserController.deleteUser);

export default router;
