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

// =============================================================================
// Seller Listing (for admin verification interface)
// =============================================================================

/**
 * A seller record enriched with user info for the admin verification table.
 * Combines fields from the User table (name, email) and SellerProfile table
 * (storeName, isApproved, commissionRate, etc.).
 */
export interface SellerWithDetails {
  userId: string; // The user's UUID (same as sellerProfile.userId)
  name: string; // User's display name
  email: string; // User's email address
  storeName: string; // The seller's store/business name
  description: string | null; // Optional store description
  isApproved: boolean; // Whether admin has approved this seller
  commissionRate: number; // Platform commission percentage (e.g., 10 = 10%)
  createdAt: string; // ISO date string – when the seller registered
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
  search?: string; // Search by name, email, or store name
  isApproved?: boolean; // Filter by approval status (true = approved, false = pending)
  page?: number;
  limit?: number;
}

/**
 * Retrieve a paginated, filterable list of all sellers with their profile details.
 * This is used by the admin panel's "Seller Verification" page.
 *
 * @param options - search, approval filter, pagination
 * @returns Paginated list of sellers enriched with user + profile info
 */
export async function listSellers(options: SellerListOptions = {}): Promise<PaginatedSellers> {
  // ---- 1. Normalise pagination ----
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(50, Math.max(1, options.limit ?? 10));
  const skip = (page - 1) * limit;

  // ---- 2. Build the WHERE clause for Prisma ----
  // We query the SellerProfile table and include the related User.
  // This gives us access to both user fields (name, email) and profile fields
  // (storeName, isApproved, etc.) in a single query.
  const where: Prisma.SellerProfileWhereInput = {};

  // Filter by approval status if specified
  if (options.isApproved !== undefined) {
    where.isApproved = options.isApproved;
  }

  // Search across name, email, and store name (case‑insensitive)
  if (options.search) {
    const term = options.search;
    where.OR = [
      { user: { name: { contains: term, mode: 'insensitive' } } },
      { user: { email: { contains: term, mode: 'insensitive' } } },
      { storeName: { contains: term, mode: 'insensitive' } },
    ];
  }

  // ---- 3. Run both queries in parallel for efficiency ----
  const [sellerProfiles, totalItems] = await Promise.all([
    prisma.sellerProfile.findMany({
      where,
      include: {
        user: {
          // Only select the fields we need for the table
          select: { id: true, name: true, email: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' }, // newest sellers first
      skip,
      take: limit,
    }),
    prisma.sellerProfile.count({ where }),
  ]);

  // ---- 4. Map the Prisma result to our SellerWithDetails shape ----
  const sellers: SellerWithDetails[] = sellerProfiles.map((profile) => ({
    userId: profile.userId,
    name: profile.user.name,
    email: profile.user.email,
    storeName: profile.storeName,
    description: profile.description,
    isApproved: profile.isApproved,
    // Prisma returns Decimal; convert to number for JSON serialisation
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
