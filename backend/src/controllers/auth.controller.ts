// backend/src/controllers/auth.controller.ts
// Handles HTTP requests for authentication endpoints.
import type { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service.js';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.registerUser(req.body);
    res.status(201).json({
      status: 'success',
      data: {
        user: result.user,
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.loginUser(req.body);
    res.status(200).json({
      status: 'success',
      data: {
        user: result.user,
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
