// backend/src/services/public-product.service.ts
// Business logic for the public product listing.
// Supports search, filtering by category and price, sorting, and pagination.
import { prisma } from '../db.js';
import type { Product, ProductImage, ProductVariation } from '@prisma/client';
import type { Prisma } from '@prisma/client'; // import type, not value

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

  // ---------------------------------------------------------------------------
  // Build the WHERE clause dynamically based on provided filters
  // ---------------------------------------------------------------------------
  const where: Prisma.ProductWhereInput = {
    status: 'ACTIVE',
  };

  // Text search: look in name, description, and brand (case‑insensitive)
  if (options.search) {
    const searchTerm = options.search;
    where.OR = [
      { name: { contains: searchTerm, mode: 'insensitive' } },
      { description: { contains: searchTerm, mode: 'insensitive' } },
      { brand: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  // Category filter: find by slug and include all subcategories
  if (options.category) {
    const categoryWithDescendants = await prisma.category.findUnique({
      where: { slug: options.category },
      include: {
        children: {
          include: {
            children: true,
          },
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

  // Price range filter – use a safe spread to avoid undefined properties
  if (options.minPrice !== undefined || options.maxPrice !== undefined) {
    where.basePrice = {
      ...(options.minPrice !== undefined && { gte: options.minPrice }),
      ...(options.maxPrice !== undefined && { lte: options.maxPrice }),
    };
  }

  // ---------------------------------------------------------------------------
  // Build the ORDER BY clause based on the sort parameter
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Execute the query with count, filtering, sorting, and pagination
  // ---------------------------------------------------------------------------
  const [products, totalItems] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        images: true,
        variations: true,
        seller: {
          select: { id: true, storeName: true },
        },
        reviews: {
          select: { rating: true },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  // Calculate average rating for each product
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
