// backend/src/routes/auth.routes.ts
import { Router } from 'express';
import { registerSchema, loginSchema, refreshTokenSchema } from '@omnimarket/shared';
import { validate } from '../middlewares/validate.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshTokenSchema), authController.refreshToken);

export default router;
