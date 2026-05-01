// backend/src/controllers/auth.controller.ts
// Handles HTTP requests for authentication endpoints.
import type { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service.js';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // req.body has already been validated by the middleware
    const user = await authService.registerUser(req.body);
    // Return 201 Created with the safe user object (no password)
    res.status(201).json({
      status: 'success',
      data: { user: authService.sanitizeUser(user) },
    });
  } catch (error) {
    next(error); // pass to global error handler
  }
}
