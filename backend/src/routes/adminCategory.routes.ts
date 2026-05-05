// backend/src/routes/adminCategory.routes.ts
// Admin category management routes – restricted to ADMIN role.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { categoryCreateSchema, categoryUpdateSchema } from '@omnimarket/shared';
import * as adminController from '../controllers/admin.controller.js';

const router = Router();

// Protect every route with authentication and ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN'));

// POST /api/admin/categories – create a new category
router.post('/', validate(categoryCreateSchema), adminController.createCategory);

// PUT /api/admin/categories/:id – update a category
router.put('/:id', validate(categoryUpdateSchema), adminController.updateCategory);

// DELETE /api/admin/categories/:id – delete a category
router.delete('/:id', adminController.deleteCategory);

export default router;
