// backend/src/routes/product.routes.ts
// Seller product routes – restricted to SELLER role.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import { validate } from '../middlewares/validate.js';
import { productCreateSchema, productUpdateSchema } from '@omnimarket/shared';
import * as productController from '../controllers/product.controller.js';

const router = Router();

// Protect every route with authentication and SELLER role
router.use(authenticate);
router.use(authorize('SELLER'));

// POST /api/seller/products
router.post('/', validate(productCreateSchema), productController.create);

// GET /api/seller/products
router.get('/', productController.list);

// GET /api/seller/products/:id
router.get('/:id', productController.getOne);

// PUT /api/seller/products/:id
router.put('/:id', validate(productUpdateSchema), productController.update);

// DELETE /api/seller/products/:id
router.delete('/:id', productController.remove);

export default router;
