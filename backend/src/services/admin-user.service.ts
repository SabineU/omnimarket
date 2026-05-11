// backend/src/services/admin-user.service.ts
// Business logic for admin user management.
import { prisma } from '../db.js';
import type { User, Prisma } from '@prisma/client';
import type { UserRole } from '@omnimarket/shared'; // <-- import the shared enum type
import { anonymizeUser } from './user.service.js'; // reuse GDPR delete

/** Options for listing users */
export interface AdminUserListOptions {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
}

/** Paginated result shape */
export interface PaginatedAdminUsers {
  users: User[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}

/**
 * List all users with optional search, role filter, and pagination.
 */
export async function listUsers(options: AdminUserListOptions = {}): Promise<PaginatedAdminUsers> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(50, Math.max(1, options.limit ?? 10));
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {};

  if (options.role) {
    where.role = options.role as UserRole; // <-- replaced `as any` with shared enum type
  }

  if (options.search) {
    const term = options.search;
    where.OR = [
      { email: { contains: term, mode: 'insensitive' } },
      { name: { contains: term, mode: 'insensitive' } },
    ];
  }

  const [users, totalItems] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      limit,
    },
  };
}

/**
 * Retrieve a single user by ID.
 */
export async function getUserById(userId: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }
  return user;
}

/**
 * Toggle the active status of a user.
 */
export async function toggleUserActiveStatus(userId: string, isActive: boolean): Promise<User> {
  await getUserById(userId);

  return prisma.user.update({
    where: { id: userId },
    data: { isActive },
  });
}

/**
 * Permanently delete (anonymise) a user account.
 */
export async function deleteUser(userId: string): Promise<void> {
  await anonymizeUser(userId);
}
