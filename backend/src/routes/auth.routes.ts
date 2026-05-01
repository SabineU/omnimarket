// backend/src/routes/auth.routes.ts
import { Router } from 'express';
import { registerSchema } from '@omnimarket/shared';
import { validate } from '../middlewares/validate.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

// POST /api/auth/register
// Body: { email, password, name, role? }
router.post('/register', validate(registerSchema), authController.register);

export default router;
