// backend/src/routes/public-product.routes.ts
// Public product listing routes – no authentication required.
import { Router } from 'express';
import * as publicProductController from '../controllers/public-product.controller.js';

const router = Router();

// GET /api/products
router.get('/', publicProductController.list);

export default router;
