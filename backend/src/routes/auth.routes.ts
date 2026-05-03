// backend/src/routes/auth.routes.ts
import { Router } from 'express';
import { registerSchema, loginSchema } from '@omnimarket/shared';
import { validate } from '../middlewares/validate.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

// POST /api/auth/register
router.post('/register', validate(registerSchema), authController.register);

// POST /api/auth/login
router.post('/login', validate(loginSchema), authController.login);

export default router;
