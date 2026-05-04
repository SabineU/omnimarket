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

export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // The body has already been validated, so refreshToken exists
    const { refreshToken } = req.body;
    const result = await authService.refreshUserToken(refreshToken);
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

// ---------------------------------------------------------------------------
// Password Reset Handlers
// ---------------------------------------------------------------------------

/**
 * POST /api/auth/forgot-password
 * Accepts an email address. If a user with that email exists, a reset token
 * is created. In development and test environments, the token is returned in
 * the response for convenience. In production, the token is only sent via email
 * and the response contains a generic message.
 */
export async function forgotPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email } = req.body;
    const token = await authService.requestPasswordReset(email);

    // Always return the same response to prevent email enumeration attacks.
    const message = 'If an account with that email exists, a password reset link has been sent.';

    res.status(200).json({
      status: 'success',
      message,
      // ⚠️ Only return the plain token in non‑production environments.
      // In production, this would be sent via email and never exposed in the API response.
      ...(process.env.NODE_ENV !== 'production' && token ? { devToken: token } : {}),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/reset-password
 * Accepts a reset token and a new password. If the token is valid and not
 * expired, the user's password is updated and the token is consumed.
 */
export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { token, newPassword } = req.body;
    await authService.resetPassword(token, newPassword);
    res.status(200).json({
      status: 'success',
      message: 'Password has been reset successfully.',
    });
  } catch (error) {
    next(error);
  }
}
