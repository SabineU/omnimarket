// backend/src/routes/upload.routes.ts
// Image upload route – restricted to SELLER role.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { authorize } from '../middlewares/rbac.js';
import { uploadSingleImage } from '../middlewares/upload.js';
import * as uploadController from '../controllers/upload.controller.js';

const router = Router();

// Protect with authentication and restrict to sellers
router.use(authenticate);
router.use(authorize('SELLER'));

// POST /api/seller/upload – accept a single file in the "image" field
router.post('/', uploadSingleImage, uploadController.uploadImage);

export default router;
