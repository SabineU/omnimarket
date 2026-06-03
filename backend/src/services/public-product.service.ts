// backend/src/services/public-product.service.ts
// Business logic for the public product listing and detail.
// Now includes flat sellerName / sellerId, plus seller rating.
import { prisma } from '../db.js';
import type { Product, ProductImage, ProductVariation } from '@prisma/client';
import type { Prisma } from '@prisma/client';

// =============================================================================
// Types
// =============================================================================

/** Type for a product returned in the public listing / detail */
export type PublicProduct = Product & {
  images: ProductImage[];
  variations: ProductVariation[];
  // Nested seller info (still included for backward compatibility if needed)
  seller: { storeName: string; id: string };
  // FLAT fields for easier frontend consumption
  sellerName: string;
  sellerId: string;
  // Seller rating across all their products
  sellerRating: number | null;
  sellerReviewCount: number;
  // Product's own rating
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

interface CategoryNode {
  id: string;
  children: CategoryNode[];
}

function collectCategoryIds(category: CategoryNode): string[] {
  const ids = [category.id];
  if (category.children && category.children.length > 0) {
    for (const child of category.children) {
      ids.push(...collectCategoryIds(child));
    }
  }
  return ids;
}

/**
 * Compute average rating and review count for a set of seller IDs.
 */
async function getSellerRatings(
  sellerIds: string[],
): Promise<Map<string, { averageRating: number | null; reviewCount: number }>> {
  const uniqueIds = [...new Set(sellerIds)];
  const result = new Map<string, { averageRating: number | null; reviewCount: number }>();

  for (const id of uniqueIds) {
    const aggregation = await prisma.review.aggregate({
      where: { product: { sellerId: id } },
      _avg: { rating: true },
      _count: { rating: true },
    });
    result.set(id, {
      averageRating: aggregation._avg.rating ?? null,
      reviewCount: aggregation._count.rating,
    });
  }
  return result;
}

// =============================================================================
// Public functions
// =============================================================================

/**
 * Retrieves a paginated, filtered, sorted list of ACTIVE products,
 * including flat sellerName, sellerId and seller rating.
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
        seller: { select: { userId: true, storeName: true } },
        reviews: { select: { rating: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  // Attach product own rating and flat seller fields
  const productsWithOwnRating: PublicProduct[] = products.map((product) => {
    const { reviews, seller, ...rest } = product;
    const reviewCount = reviews.length;
    const averageRating =
      reviewCount > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount : null;
    return {
      ...rest,
      seller: {
        id: seller.userId,
        storeName: seller.storeName,
      },
      sellerId: seller.userId,
      sellerName: seller.storeName,
      averageRating,
      reviewCount,
      sellerRating: null, // will be filled next
      sellerReviewCount: 0,
    } as PublicProduct;
  });

  // Fetch seller ratings
  const sellerIds = [...new Set(productsWithOwnRating.map((p) => p.sellerId))];
  const sellerRatings = await getSellerRatings(sellerIds);

  const finalProducts: PublicProduct[] = productsWithOwnRating.map((p) => ({
    ...p,
    sellerRating: sellerRatings.get(p.sellerId)?.averageRating ?? null,
    sellerReviewCount: sellerRatings.get(p.sellerId)?.reviewCount ?? 0,
  }));

  return {
    products: finalProducts,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      limit,
    },
  };
}

/**
 * Retrieve a single product by slug, with flat sellerName, seller rating,
 * and related products.
 */
export async function getProductBySlug(slug: string): Promise<PublicProductDetail> {
  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      variations: true,
      seller: { select: { userId: true, storeName: true } },
      reviews: { select: { rating: true } },
    },
  });

  if (!product) throw new Error('Product not found');

  const { reviews, seller, ...rest } = product;
  const reviewCount = reviews.length;
  const averageRating =
    reviewCount > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount : null;

  // Seller rating
  const sellerRatingMap = await getSellerRatings([seller.userId]);
  const sellerStats = sellerRatingMap.get(seller.userId);

  const mainProduct: PublicProduct = {
    ...rest,
    seller: {
      id: seller.userId,
      storeName: seller.storeName,
    },
    sellerId: seller.userId,
    sellerName: seller.storeName,
    averageRating,
    reviewCount,
    sellerRating: sellerStats?.averageRating ?? null,
    sellerReviewCount: sellerStats?.reviewCount ?? 0,
  } as PublicProduct;

  // Related products
  const relatedProductsRaw = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      id: { not: product.id },
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
    orderBy: { createdAt: 'desc' },
    take: 4,
  });

  const relatedProducts: RelatedProduct[] = relatedProductsRaw.map((rp) => {
    const rpReviewCount = rp.reviews.length;
    const rpAverageRating =
      rpReviewCount > 0 ? rp.reviews.reduce((sum, r) => sum + r.rating, 0) / rpReviewCount : null;
    return {
      id: rp.id,
      name: rp.name,
      slug: rp.slug,
      basePrice: Number(rp.basePrice),
      images: rp.images.map((img) => ({ url: img.url, altText: img.altText })),
      averageRating: rpAverageRating,
      reviewCount: rpReviewCount,
    };
  });

  return { ...mainProduct, relatedProducts };
}

/**
 * Retrieve a list of active products by their IDs (for Recently Viewed).
 */
export async function getProductsByIds(ids: string[]): Promise<RelatedProduct[]> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return [];

  const products = await prisma.product.findMany({
    where: { id: { in: uniqueIds }, status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      slug: true,
      basePrice: true,
      images: { take: 1, orderBy: { sortOrder: 'asc' } },
      reviews: { select: { rating: true } },
    },
  });

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
