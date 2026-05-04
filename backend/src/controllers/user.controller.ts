// backend/src/controllers/user.controller.ts
// Handles HTTP requests for user profile endpoints.
import type { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service.js';

/**
 * Helper that extracts the authenticated user's ID from `req.user`.
 */
function getAuthenticatedUserId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) {
    throw new Error('User not authenticated – req.user is missing');
  }
  return userId;
}

/**
 * GET /api/users/me
 */
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const profile = await userService.getProfile(userId);
    res.status(200).json({
      status: 'success',
      data: { user: profile },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/users/me
 */
export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const updatedProfile = await userService.updateProfile(userId, req.body);
    res.status(200).json({
      status: 'success',
      data: { user: updatedProfile },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/users/me
 * Anonymizes the authenticated user's account (GDPR right to erasure).
 */
export async function deleteMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const anonymizedUser = await userService.anonymizeUser(userId);
    res.status(200).json({
      status: 'success',
      data: { user: anonymizedUser },
      message: 'Your account has been anonymised. You cannot log in again.',
    });
  } catch (error) {
    next(error);
  }
}
