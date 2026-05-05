// backend/src/services/public-product.service.ts
// Business logic for the public product listing and detail.
// Supports search, filtering by category and price, sorting, and pagination.
import { prisma } from '../db.js';
import type { Product, ProductImage, ProductVariation } from '@prisma/client';
import type { Prisma } from '@prisma/client';

/** Type for a product returned in the public listing */
export type PublicProduct = Product & {
  images: ProductImage[];
  variations: ProductVariation[];
  seller: { storeName: string; id: string };
  averageRating: number | null;
  reviewCount: number;
};

/** Options that can be passed to the listing endpoint */
export interface ProductListOptions {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  page?: number;
  limit?: number;
}

/** Result shape including pagination metadata */
export interface PaginatedProducts {
  products: PublicProduct[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}

/** A minimal recursive type for the category tree used in the helper */
interface CategoryNode {
  id: string;
  children: CategoryNode[];
}

/**
 * Retrieves a paginated, filtered, sorted list of ACTIVE products.
 */
export async function getPublicProducts(options: ProductListOptions): Promise<PaginatedProducts> {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(100, Math.max(1, options.limit ?? 20));
  const skip = (page - 1) * limit;

  const where: Prisma.ProductWhereInput = { status: 'ACTIVE' };

  if (options.search) {
    const searchTerm = options.search;
    where.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { description: { contains: searchTerm, mode: 'insensitive' } },
      { brand: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  if (options.category) {
    const categoryWithDescendants = await prisma.category.findUnique({
      where: { slug: options.category },
      include: {
        children: {
          include: { children: true },
        },
      },
    });

    if (categoryWithDescendants) {
      const categoryIds = collectCategoryIds(categoryWithDescendants as unknown as CategoryNode);
      where.categoryId = { in: categoryIds };
    } else {
      return {
        products: [],
        pagination: {
          currentPage: page,
          totalPages: 1,
          totalItems: 0,
          limit,
        },
      };
    }
  }

  if (options.minPrice !== undefined || options.maxPrice !== undefined) {
    where.basePrice = {
      ...(options.minPrice !== undefined && { gte: options.minPrice }),
      ...(options.maxPrice !== undefined && { lte: options.maxPrice }),
    };
  }

  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
  switch (options.sort) {
    case 'price_asc':
      orderBy = { basePrice: 'asc' };
      break;
    case 'price_desc':
      orderBy = { basePrice: 'desc' };
      break;
    case 'name_asc':
      orderBy = { name: 'asc' };
      break;
    case 'name_desc':
      orderBy = { name: 'desc' };
      break;
    case 'newest':
      orderBy = { createdAt: 'desc' };
      break;
  }

  const [products, totalItems] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        images: true,
        variations: true,
        seller: { select: { id: true, storeName: true } },
        reviews: { select: { rating: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const productsWithRating: PublicProduct[] = products.map((product) => {
    const { reviews, ...rest } = product;
    const reviewCount = reviews.length;
    const averageRating =
      reviewCount > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount : null;
    return { ...rest, averageRating, reviewCount };
  });

  return {
    products: productsWithRating,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      limit,
    },
  };
}

/**
 * Retrieve a single product by its URL‑friendly slug.
 * Includes images, variations, seller info, and review statistics.
 * Throws a generic error if the slug is not found.
 */
export async function getProductBySlug(slug: string): Promise<PublicProduct> {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      variations: true,
      seller: {
        select: { id: true, storeName: true },
      },
      reviews: {
        select: { rating: true },
      },
    },
  });

  if (!product) {
    throw new Error('Product not found');
  }

  // Calculate average rating
  const { reviews, ...rest } = product;
  const reviewCount = reviews.length;
  const averageRating =
    reviewCount > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount : null;

  return { ...rest, averageRating, reviewCount };
}

/**
 * Helper: recursively collect all category IDs from a tree node (including itself).
 */
function collectCategoryIds(category: CategoryNode): string[] {
  const ids = [category.id];
  if (category.children && category.children.length > 0) {
    for (const child of category.children) {
      ids.push(...collectCategoryIds(child));
    }
  }
  return ids;
}
