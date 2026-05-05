// backend/src/services/admin.service.ts
// Business logic for admin operations – seller approval, category management, product moderation.
import { prisma } from '../db.js';
import type { SellerProfile, Category, Product } from '@prisma/client';
import type { Prisma } from '@prisma/client'; // <-- changed to import type
import type { ProductStatus } from '@prisma/client';

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
// Seller Approval
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
// Category CRUD
// ---------------------------------------------------------------------------
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

export async function updateCategory(
  categoryId: string,
  data: {
    name?: string;
    slug?: string;
    parentId?: string | null;
    imageUrl?: string | null;
  },
): Promise<Category> {
  await prisma.category.findUniqueOrThrow({ where: { id: categoryId } });

  return prisma.category.update({
    where: { id: categoryId },
    data,
  });
}

export async function deleteCategory(categoryId: string): Promise<void> {
  await prisma.category.findUniqueOrThrow({ where: { id: categoryId } });
  await prisma.category.delete({ where: { id: categoryId } });
}

// ---------------------------------------------------------------------------
// Product Moderation
// ---------------------------------------------------------------------------

/**
 * Returns all products, optionally filtered by status.
 * Includes seller info (store name) and category name.
 */
export async function getAllProducts(options?: { status?: string }): Promise<Product[]> {
  const where: Prisma.ProductWhereInput = {};

  if (options?.status) {
    where.status = options.status as ProductStatus;
  }

  return prisma.product.findMany({
    where,
    include: {
      seller: { select: { storeName: true } },
      category: { select: { name: true } },
      images: true,
      variations: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Update the status of a product.
 * Throws if the product does not exist.
 */
export async function updateProductStatus(productId: string, status: string): Promise<Product> {
  await prisma.product.findUniqueOrThrow({ where: { id: productId } });

  return prisma.product.update({
    where: { id: productId },
    data: { status: status as ProductStatus },
    include: {
      seller: { select: { storeName: true } },
      category: { select: { name: true } },
      images: true,
      variations: true,
    },
  });
}
