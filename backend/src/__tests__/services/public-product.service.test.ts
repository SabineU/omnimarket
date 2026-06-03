/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/public-product.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPublicProducts, getProductBySlug } from '../../services/public-product.service.js';

// Mock the database module
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
    },
  };
});

import { prisma } from '../../db.js';

beforeEach((): void => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helper: simulate a Prisma Decimal object so we can mock .toNumber()
// ---------------------------------------------------------------------------
function decimal(n: number): { toNumber: () => number } {
  return { toNumber: (): number => n };
}

// =============================================================================
// getPublicProducts (existing – unchanged)
// =============================================================================
describe('getPublicProducts', () => {
  it('should return products with default pagination and only ACTIVE status', async (): Promise<void> => {
    const mockProducts = [
      {
        id: 'p1',
        name: 'Product A',
        status: 'ACTIVE',
        basePrice: 100,
        images: [],
        variations: [],
        seller: { id: 's1', storeName: 'Store A' },
        reviews: [],
      },
    ];
    vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts as any);
    vi.mocked(prisma.product.count).mockResolvedValue(1);

    const result = await getPublicProducts({});
    expect(result.products).toHaveLength(1);
    expect(result.pagination.totalItems).toBe(1);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'ACTIVE' },
        skip: 0,
        take: 20,
      }),
    );
  });

  it('should apply text search filter', async (): Promise<void> => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(0);

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

    await getPublicProducts({ minPrice: 10, maxPrice: 50 });
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          basePrice: { gte: 10, lte: 50 },
        }),
      }),
    );
  });

  it('should respect pagination parameters', async (): Promise<void> => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(100);

    await getPublicProducts({ page: 3, limit: 10 });
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 20,
        take: 10,
      }),
    );
  });

  it('should sort by price ascending', async (): Promise<void> => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);
    vi.mocked(prisma.product.count).mockResolvedValue(0);

    await getPublicProducts({ sort: 'price_asc' });
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { basePrice: 'asc' },
      }),
    );
  });
});

// =============================================================================
// getProductBySlug (UPDATED – now includes relatedProducts)
// =============================================================================
describe('getProductBySlug', () => {
  it('should return a product with its details AND related products', async (): Promise<void> => {
    // Mock the main product – use the decimal helper for basePrice
    const mockProduct = {
      id: 'p1',
      slug: 'smartphone',
      name: 'Smartphone',
      basePrice: decimal(699.99), // <-- uses typed helper
      status: 'ACTIVE',
      categoryId: 'cat1',
      images: [{ url: 'http://example.com/img.jpg', altText: 'Phone', sortOrder: 0 }],
      variations: [{ sku: 'SP1', color: 'Black', stockQty: 10 }],
      seller: { userId: 's1', storeName: 'TechStore' },
      reviews: [{ rating: 5 }, { rating: 4 }],
    };
    vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct as any);

    // Mock related products
    const mockRelated = [
      {
        id: 'p2',
        name: 'Tablet',
        slug: 'tablet',
        basePrice: decimal(399.99), // <-- typed helper
        images: [{ url: 'http://example.com/tablet.jpg', altText: 'Tablet' }],
        reviews: [{ rating: 4.5 }],
      },
    ];
    vi.mocked(prisma.product.findMany).mockResolvedValue(mockRelated as any);

    const result = await getProductBySlug('smartphone');

    // Main product checks
    expect(result.name).toBe('Smartphone');
    expect(result.averageRating).toBe(4.5);
    expect(result.reviewCount).toBe(2);

    // Related products checks
    expect(result.relatedProducts).toBeDefined();
    expect(result.relatedProducts).toHaveLength(1);
    expect(result.relatedProducts[0].slug).toBe('tablet');
    expect(result.relatedProducts[0].basePrice).toBe(399.99);
    expect(result.relatedProducts[0].averageRating).toBe(4.5);

    // Verify the related products query was called correctly
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          categoryId: 'cat1',
          id: { not: 'p1' },
          status: 'ACTIVE',
        },
        take: 4,
      }),
    );
  });

  it('should throw an error if the slug is not found', async (): Promise<void> => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);
    await expect(getProductBySlug('nonexistent')).rejects.toThrow('Product not found');
  });

  it('should return empty relatedProducts if no other products in category', async (): Promise<void> => {
    const mockProduct = {
      id: 'p1',
      slug: 'unique',
      name: 'Unique',
      basePrice: decimal(99.99), // <-- typed helper
      status: 'ACTIVE',
      categoryId: 'cat2',
      images: [],
      variations: [],
      seller: { userId: 's1', storeName: 'Solo' },
      reviews: [],
    };
    vi.mocked(prisma.product.findUnique).mockResolvedValue(mockProduct as any);
    vi.mocked(prisma.product.findMany).mockResolvedValue([]);

    const result = await getProductBySlug('unique');
    expect(result.relatedProducts).toEqual([]);
  });
});
