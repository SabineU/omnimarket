// backend/src/routes/public-product.routes.ts
// Public product listing and detail routes – no authentication required.
import { Router } from 'express';
import * as publicProductController from '../controllers/public-product.controller.js';

const router = Router();

// GET /api/products
router.get('/', publicProductController.list);

// GET /api/products/:slug
router.get('/:slug', publicProductController.getBySlug);

export default router;
