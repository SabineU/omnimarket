// backend/src/services/admin.service.ts
// Business logic for admin operations – seller approval, category management, product moderation.
// UPDATED: getAllProducts now returns a flat sellerName/categoryName shape.
import { prisma } from '../db.js';
import type { SellerProfile, Category } from '@prisma/client'; // Removed Product
import type { Prisma } from '@prisma/client';
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
// Type for the flattened product returned by moderation endpoints
// ---------------------------------------------------------------------------
export interface ModeratedProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  status: string;
  brand: string | null;
  sellerId: string;
  sellerName: string; // flat – from seller.storeName
  categoryName: string; // flat – from category.name
  images: { id: string; url: string; altText: string; sortOrder: number }[];
  variations: {
    id: string;
    sku: string;
    size: string | null;
    color: string | null;
    priceModifier: number;
    stockQty: number;
  }[];
  createdAt: string;
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
 * Includes seller info (store name) and category name, flattened for the frontend.
 */
export async function getAllProducts(options?: { status?: string }): Promise<ModeratedProduct[]> {
  const where: Prisma.ProductWhereInput = {};

  if (options?.status) {
    where.status = options.status as ProductStatus;
  }

  const products = await prisma.product.findMany({
    where,
    include: {
      seller: { select: { storeName: true } },
      category: { select: { name: true } },
      images: true,
      variations: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Flatten the nested relations into the top-level fields the frontend expects
  return products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    basePrice: Number(product.basePrice), // convert Decimal to number
    status: product.status,
    brand: product.brand,
    sellerId: product.sellerId,
    sellerName: product.seller?.storeName ?? '—', // flatten storeName
    categoryName: product.category?.name ?? 'Unknown', // flatten category name
    images: product.images,
    variations: product.variations.map((v) => ({
      ...v,
      priceModifier: Number(v.priceModifier), // convert Decimal to number
    })),
    createdAt: product.createdAt.toISOString(),
  }));
}

/**
 * Update the status of a product.
 * Throws if the product does not exist.
 * Returns the flattened version for consistency.
 */
export async function updateProductStatus(
  productId: string,
  status: string,
): Promise<ModeratedProduct> {
  await prisma.product.findUniqueOrThrow({ where: { id: productId } });

  const product = await prisma.product.update({
    where: { id: productId },
    data: { status: status as ProductStatus },
    include: {
      seller: { select: { storeName: true } },
      category: { select: { name: true } },
      images: true,
      variations: true,
    },
  });

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    basePrice: Number(product.basePrice),
    status: product.status,
    brand: product.brand,
    sellerId: product.sellerId,
    sellerName: product.seller?.storeName ?? '—',
    categoryName: product.category?.name ?? 'Unknown',
    images: product.images,
    variations: product.variations.map((v) => ({
      ...v,
      priceModifier: Number(v.priceModifier),
    })),
    createdAt: product.createdAt.toISOString(),
  };
}

// =============================================================================
// Seller Listing (for admin verification interface)
// =============================================================================

/**
 * A seller record enriched with user info for the admin verification table.
 */
export interface SellerWithDetails {
  userId: string;
  name: string;
  email: string;
  storeName: string;
  description: string | null;
  isApproved: boolean;
  commissionRate: number;
  createdAt: string;
}

/** Paginated result wrapper for the seller list */
export interface PaginatedSellers {
  sellers: SellerWithDetails[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}

/** Filtering and pagination options for the seller list */
export interface SellerListOptions {
  search?: string;
  isApproved?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Retrieve a paginated, filterable list of all sellers with their profile details.
 */
export async function listSellers(options: SellerListOptions = {}): Promise<PaginatedSellers> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(50, Math.max(1, options.limit ?? 10));
  const skip = (page - 1) * limit;

  const where: Prisma.SellerProfileWhereInput = {};

  if (options.isApproved !== undefined) {
    where.isApproved = options.isApproved;
  }

  if (options.search) {
    const term = options.search;
    where.OR = [
      { user: { name: { contains: term, mode: 'insensitive' } } },
      { user: { email: { contains: term, mode: 'insensitive' } } },
      { storeName: { contains: term, mode: 'insensitive' } },
    ];
  }

  const [sellerProfiles, totalItems] = await Promise.all([
    prisma.sellerProfile.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.sellerProfile.count({ where }),
  ]);

  const sellers: SellerWithDetails[] = sellerProfiles.map((profile) => ({
    userId: profile.userId,
    name: profile.user.name,
    email: profile.user.email,
    storeName: profile.storeName,
    description: profile.description,
    isApproved: profile.isApproved,
    commissionRate: Number(profile.commissionRate),
    createdAt: profile.user.createdAt.toISOString(),
  }));

  return {
    sellers,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      limit,
    },
  };
}
