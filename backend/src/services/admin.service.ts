// backend/src/services/admin.service.ts
// Business logic for admin operations – seller approval, category management.
import { prisma } from '../db.js';
import type { SellerProfile, Category } from '@prisma/client';

// ---------------------------------------------------------------------------
// Custom Errors
// ---------------------------------------------------------------------------
export class SellerNotFoundError extends Error {
  constructor(userId: string) {
    super(`Seller profile for user ${userId} not found`);
    this.name = 'SellerNotFoundError';
  }
}

// ---------------------------------------------------------------------------
// Seller Approval (existing)
// ---------------------------------------------------------------------------
export async function approveSeller(userId: string, isApproved: boolean): Promise<SellerProfile> {
  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId },
    include: { user: true },
  });

  if (!sellerProfile) {
    throw new SellerNotFoundError(userId);
  }

  if (sellerProfile.user.role !== 'SELLER') {
    throw new Error('User is not a seller');
  }

  return prisma.sellerProfile.update({
    where: { userId },
    data: { isApproved },
  });
}

// ---------------------------------------------------------------------------
// Category CRUD (new)
// ---------------------------------------------------------------------------

/**
 * Create a new category.
 * @param data - name, slug, optional parentId and imageUrl
 * @returns the created category
 */
export async function createCategory(data: {
  name: string;
  slug: string;
  parentId?: string | null;
  imageUrl?: string | null;
}): Promise<Category> {
  return prisma.category.create({
    data: {
      name: data.name,
      slug: data.slug,
      parentId: data.parentId ?? null,
      imageUrl: data.imageUrl ?? null,
    },
  });
}

/**
 * Update an existing category by its ID.
 * Only the fields present in `data` will be changed.
 * @param categoryId - the ID of the category to update
 * @param data - partial fields to update
 * @returns the updated category
 * @throws if the category does not exist
 */
export async function updateCategory(
  categoryId: string,
  data: {
    name?: string;
    slug?: string;
    parentId?: string | null;
    imageUrl?: string | null;
  },
): Promise<Category> {
  // Ensure the category exists (will throw if not found)
  await prisma.category.findUniqueOrThrow({ where: { id: categoryId } });

  return prisma.category.update({
    where: { id: categoryId },
    data,
  });
}

/**
 * Delete a category by its ID.
 * Children of this category will have their parentId set to NULL
 * (onDelete: SetNull in the schema), making them top‑level categories.
 * @param categoryId - the ID of the category to delete
 */
export async function deleteCategory(categoryId: string): Promise<void> {
  await prisma.category.findUniqueOrThrow({ where: { id: categoryId } });
  await prisma.category.delete({ where: { id: categoryId } });
}
