// backend/src/controllers/admin-user.controller.ts
// Handles HTTP requests for admin user management.
import type { Request, Response, NextFunction } from 'express';
import * as adminUserService from '../services/admin-user.service.js';

/** Extract a single route parameter safely */
function getParam(req: Request, name: string): string {
  const val = req.params[name];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

/**
 * GET /api/admin/users
 * Query: ?search=...&role=...&page=1&limit=10
 */
export async function listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const options: adminUserService.AdminUserListOptions = {
      search: req.query.search as string | undefined,
      role: req.query.role as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };

    const result = await adminUserService.listUsers(options);
    res.status(200).json({
      status: 'success',
      data: {
        users: result.users,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/users/:id
 */
export async function getUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getParam(req, 'id');
    const user = await adminUserService.getUserById(userId);
    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/users/:id/active-status
 * Body: { isActive: boolean }
 */
export async function toggleActiveStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getParam(req, 'id');
    const { isActive } = req.body;
    const user = await adminUserService.toggleUserActiveStatus(userId, isActive);
    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/users/:id
 * Permanently anonymise the user account.
 */
export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = getParam(req, 'id');
    await adminUserService.deleteUser(userId);
    res.status(200).json({
      status: 'success',
      message: 'User has been deleted (anonymised).',
    });
  } catch (error) {
    next(error);
  }
}
