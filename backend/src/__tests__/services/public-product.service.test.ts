/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPublicProducts, getProductBySlug } from '../../services/public-product.service.js';

vi.mock('../../db.js', () => {
  return {
    prisma: {
      product: {
        findMany: vi.fn(),
        count: vi.fn(),
        findUnique: vi.fn(),
      },
      category: {
        findUnique: vi.fn(),
      },
      review: {
        aggregate: vi.fn(), // <-- NEW: for seller ratings
      },
    },
  };
});

import { prisma } from '../../db.js';

function decimal(n: number): { toNumber: () => number } {
  return { toNumber: (): number => n };
}

beforeEach((): void => {
  vi.clearAllMocks();
});

// =============================================================================
// getPublicProducts
// =============================================================================
describe('getPublicProducts', () => {
  it('should return products with seller rating', async (): Promise<void> => {
    const mockProducts = [
      {
        id: 'p1',
        name: 'Product A',
        status: 'ACTIVE',
        basePrice: 100,
        sellerId: 's1',
        images: [],
        variations: [],
        seller: { userId: 's1', storeName: 'Store A' },
        reviews: [],
      },
    ];
    vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts as any);
    vi.mocked(prisma.product.count).mockResolvedValue(1);

    // Mock the seller rating aggregation – for seller 's1'
    vi.mocked(prisma.review.aggregate).mockResolvedValueOnce({
      _avg: { rating: 4.5 },
      _count: { rating: 12 },
    } as any);

    const result = await getPublicProducts({});

    expect(result.products).toHaveLength(1);
    expect(result.products[0].sellerRating).toBe(4.5);
    expect(result.products[0].sellerReviewCount).toBe(12);

    // Verify the aggregate was called for the correct seller
    expect(prisma.review.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { product: { sellerId: 's1' } },
      }),
    );
  });

  // Additional tests for search, category, price, pagination, sort remain the same
  it('should apply text search filter', async (): Promise<void> => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(0);
    vi.mocked(prisma.review.aggregate).mockResolvedValue({ _avg: {}, _count: {} } as any);

    await getPublicProducts({ search: 'laptop' });
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'ACTIVE',
          OR: [
            { name: { contains: 'laptop', mode: 'insensitive' } },
            { description: { contains: 'laptop', mode: 'insensitive' } },
            { brand: { contains: 'laptop', mode: 'insensitive' } },
          ],
        }),
      }),
    );
  });

  it('should filter by category slug and include descendants', async (): Promise<void> => {
    const mockCategory = {
      id: 'cat-1',
      slug: 'electronics',
      children: [{ id: 'cat-2', slug: 'laptops', children: [] }],
    };
    vi.mocked(prisma.category.findUnique).mockResolvedValue(mockCategory as any);
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(0);
    vi.mocked(prisma.review.aggregate).mockResolvedValue({ _avg: {}, _count: {} } as any);

    await getPublicProducts({ category: 'electronics' });
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          categoryId: { in: ['cat-1', 'cat-2'] },
        }),
      }),
    );
  });

  it('should apply price range filters', async (): Promise<void> => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(0);
    vi.mocked(prisma.review.aggregate).mockResolvedValue({ _avg: {}, _count: {} } as any);

    await getPublicProducts({ minPrice: 10, maxPrice: 50 });
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          basePrice: { gte: 10, lte: 50 },
        }),
      }),
    );
  });

  it('should respect pagination', async (): Promise<void> => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(100);
    vi.mocked(prisma.review.aggregate).mockResolvedValue({ _avg: {}, _count: {} } as any);

    await getPublicProducts({ page: 3, limit: 10 });
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
  });

  it('should sort by price ascending', async (): Promise<void> => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(0);
    vi.mocked(prisma.review.aggregate).mockResolvedValue({ _avg: {}, _count: {} } as any);

    await getPublicProducts({ sort: 'price_asc' });
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { basePrice: 'asc' } }),
    );
  });
});

// =============================================================================
// getProductBySlug
// =============================================================================
describe('getProductBySlug', () => {
  it('should return a product with seller rating and related products', async (): Promise<void> => {
    const mockProduct = {
      id: 'p1',
      slug: 'smartphone',
      name: 'Smartphone',
      basePrice: decimal(699.99),
      status: 'ACTIVE',
      categoryId: 'cat1',
      sellerId: 's1',
      images: [],
      variations: [],
      seller: { userId: 's1', storeName: 'TechStore' },
      reviews: [{ rating: 5 }, { rating: 4 }],
    };
    vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct as any);

    // Related products (empty)
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);

    // Seller rating aggregation
    vi.mocked(prisma.review.aggregate).mockResolvedValueOnce({
      _avg: { rating: 4.2 },
      _count: { rating: 8 },
    } as any);

    const result = await getProductBySlug('smartphone');
    expect(result.name).toBe('Smartphone');
    expect(result.sellerRating).toBe(4.2);
    expect(result.sellerReviewCount).toBe(8);
    expect(result.relatedProducts).toEqual([]);
  });

  it('should throw if not found', async (): Promise<void> => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);
    await expect(getProductBySlug('nonexistent')).rejects.toThrow('Product not found');
  });
});
