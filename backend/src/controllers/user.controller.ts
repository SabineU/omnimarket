// backend/src/controllers/user.controller.ts
// Handles HTTP requests for user profile endpoints.
import type { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service.js';

/**
 * Helper that extracts the authenticated user's ID from `req.user`.
 * Because the `authenticate` middleware runs first, `req.user` should always exist.
 * If it doesn't, we throw a 500 error (critical bug).
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
 * Returns the profile of the currently authenticated user.
 * Requires a valid access token.
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
 * Updates the profile of the currently authenticated user.
 * Only allowed fields (name, avatarUrl) are accepted.
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
