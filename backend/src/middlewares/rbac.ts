// backend/src/middlewares/rbac.ts
// RBAC means: Role‑Based Access Control middleware.
// It checks that req.user exists (should be placed after the auth middleware)
// and that the user's role is in the allowed list.
// If not, it returns 403 Forbidden.

import type { Request, Response, NextFunction } from 'express';

/**
 * Middleware factory that returns a middleware restricting access to specific roles.
 * @param allowedRoles - A list of roles that are permitted to access the route.
 * @returns Express middleware function.
 *
 * Usage example:
 *   router.get('/admin-only', authenticate, authorize('admin'), handler);
 */
export function authorize(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // The auth middleware must run before this, so req.user should exist.
    if (!req.user) {
      res.status(401).json({
        status: 'error',
        message: 'Authentication required.',
      });
      return;
    }

    // Check if the user's role is in the allowed list.
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        status: 'error',
        message: `Access denied. Required roles: ${allowedRoles.join(' or ')}.`,
      });
      return;
    }

    // Role is allowed – proceed to the next handler.
    next();
  };
}
