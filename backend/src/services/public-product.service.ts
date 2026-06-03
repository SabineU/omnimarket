// backend/src/services/public-product.service.ts
// Business logic for the public product listing and detail.
// Supports search, filtering by category and price, sorting, and pagination.
// UPDATED: getProductBySlug now includes a "relatedProducts" field
//          (same category, excluding the current product).

import { prisma } from '../db.js';
import type { Product, ProductImage, ProductVariation } from '@prisma/client';
import type { Prisma } from '@prisma/client';

// =============================================================================
// Types
// =============================================================================

/** Type for a product returned in the public listing */
export type PublicProduct = Product & {
  images: ProductImage[];
  variations: ProductVariation[];
  seller: { storeName: string; id: string }; // we map userId → id ourselves
  averageRating: number | null;
  reviewCount: number;
};

/** A lightweight product used in the "Related Products" section */
export interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  images: { url: string; altText: string }[];
  averageRating: number | null;
  reviewCount: number;
}

/** The full detail response including related products */
export interface PublicProductDetail extends PublicProduct {
  relatedProducts: RelatedProduct[];
}

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

// =============================================================================
// Helpers
// =============================================================================

/** A minimal recursive type for the category tree used in the helper */
interface CategoryNode {
  id: string;
  children: CategoryNode[];
}

/** Collect a category’s id and all its descendant ids */
function collectCategoryIds(category: CategoryNode): string[] {
  const ids = [category.id];
  if (category.children && category.children.length > 0) {
    for (const child of category.children) {
      ids.push(...collectCategoryIds(child));
    }
  }
  return ids;
}

// =============================================================================
// Public functions
// =============================================================================

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
        children: { include: { children: true } },
      },
    });

    if (categoryWithDescendants) {
      const categoryIds = collectCategoryIds(categoryWithDescendants as unknown as CategoryNode);
      where.categoryId = { in: categoryIds };
    } else {
      return {
        products: [],
        pagination: { currentPage: page, totalPages: 1, totalItems: 0, limit },
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
        seller: {
          select: {
            userId: true, // <-- use userId instead of id
            storeName: true,
          },
        },
        reviews: {
          select: { rating: true },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const productsWithRating: PublicProduct[] = products.map((product) => {
    const { reviews, seller, ...rest } = product;
    const reviewCount = reviews.length;
    const averageRating =
      reviewCount > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount : null;
    return {
      ...rest,
      seller: {
        id: seller.userId, // map userId → id
        storeName: seller.storeName,
      },
      averageRating,
      reviewCount,
    };
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
 * Retrieve a single product by its URL‑friendly slug,
 * INCLUDING related products (same category, up to 4).
 */
export async function getProductBySlug(slug: string): Promise<PublicProductDetail> {
  // ---- 1. Fetch the main product ----
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      variations: true,
      seller: {
        select: {
          userId: true, // <-- use userId instead of id
          storeName: true,
        },
      },
      reviews: {
        select: { rating: true },
      },
    },
  });

  if (!product) {
    throw new Error('Product not found');
  }

  const { reviews, seller, ...rest } = product;
  const reviewCount = reviews.length;
  const averageRating =
    reviewCount > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount : null;

  // Build the main product object
  const mainProduct: PublicProduct = {
    ...rest,
    seller: {
      id: seller.userId, // map userId → id
      storeName: seller.storeName,
    },
    averageRating,
    reviewCount,
  };

  // ---- 2. Fetch related products (same category, excluding current product, up to 4) ----
  const relatedProductsRaw = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      id: { not: product.id }, // exclude the current product
      status: 'ACTIVE', // only show active products
    },
    select: {
      id: true,
      name: true,
      slug: true,
      basePrice: true,
      images: { take: 1, orderBy: { sortOrder: 'asc' } }, // only need the first image
      reviews: { select: { rating: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 4, // at most 4 related products
  });

  // Map raw related products to the RelatedProduct shape
  const relatedProducts: RelatedProduct[] = relatedProductsRaw.map((rp) => {
    const rpReviewCount = rp.reviews.length;
    const rpAverageRating =
      rpReviewCount > 0 ? rp.reviews.reduce((sum, r) => sum + r.rating, 0) / rpReviewCount : null;
    return {
      id: rp.id,
      name: rp.name,
      slug: rp.slug,
      basePrice: Number(rp.basePrice), // Decimal → number
      images: rp.images.map((img) => ({ url: img.url, altText: img.altText })),
      averageRating: rpAverageRating,
      reviewCount: rpReviewCount,
    };
  });

  // ---- 3. Return the combined result ----
  return {
    ...mainProduct,
    relatedProducts,
  };
}

/**
 * Retrieve a list of active products by their IDs.
 * Used for the "Recently Viewed" strip.
 * Returns a lightweight product shape (no variations, only first image).
 * Products are returned in the same order as the input IDs.
 * @param ids – array of product UUIDs
 */
export async function getProductsByIds(ids: string[]): Promise<RelatedProduct[]> {
  // Remove duplicates while preserving order
  const uniqueIds = [...new Set(ids)];

  if (uniqueIds.length === 0) return [];

  // Fetch products that match the given IDs and are ACTIVE
  const products = await prisma.product.findMany({
    where: {
      id: { in: uniqueIds },
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      slug: true,
      basePrice: true,
      images: { take: 1, orderBy: { sortOrder: 'asc' } },
      reviews: { select: { rating: true } },
    },
  });

  // Sort the result back into the original order of uniqueIds
  const idToIndex = new Map(uniqueIds.map((id, idx) => [id, idx]));
  const sorted = products.sort((a, b) => (idToIndex.get(a.id) ?? 0) - (idToIndex.get(b.id) ?? 0));

  return sorted.map((p) => {
    const reviewCount = p.reviews.length;
    const averageRating =
      reviewCount > 0 ? p.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount : null;
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      basePrice: Number(p.basePrice),
      images: p.images.map((img) => ({ url: img.url, altText: img.altText })),
      averageRating,
      reviewCount,
    };
  });
}
