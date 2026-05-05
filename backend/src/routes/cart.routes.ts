// backend/src/routes/cart.routes.ts
// Cart routes – all require authentication.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { addToCartSchema, updateCartItemSchema } from '@omnimarket/shared';
import * as cartController from '../controllers/cart.controller.js';

const router = Router();

// Protect every route with authentication middleware
router.use(authenticate);

// GET /api/cart
router.get('/', cartController.getCart);

// POST /api/cart/items
router.post('/items', validate(addToCartSchema), cartController.addItem);

// PATCH /api/cart/items/:itemId
router.patch('/items/:itemId', validate(updateCartItemSchema), cartController.updateItem);

// DELETE /api/cart/items/:itemId
router.delete('/items/:itemId', cartController.removeItem);

export default router;
