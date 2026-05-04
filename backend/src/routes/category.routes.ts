// backend/src/routes/category.routes.ts
// Public category routes – no authentication required.
import { Router } from 'express';
import * as categoryController from '../controllers/category.controller.js';

const router = Router();

// GET /api/categories – full category tree
router.get('/', categoryController.getTree);

// GET /api/categories/:slug – single category by slug
router.get('/:slug', categoryController.getBySlug);

export default router;
