// backend/src/routes/user.routes.ts
// User profile routes – all require authentication.
import { Router } from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { updateProfileSchema } from '@omnimarket/shared';
import * as userController from '../controllers/user.controller.js';

const router = Router();

// Protect every route in this router with the auth middleware
router.use(authenticate);

// GET /api/users/me – fetch current user's profile
router.get('/me', userController.getMe);

// PUT /api/users/me – update current user's profile
router.put('/me', validate(updateProfileSchema), userController.updateMe);

export default router;
