/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/product.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createProduct,
  getSellerProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from '../../services/product.service.js';

// Mock the database module
vi.mock('../../db.js', () => {
  return {
    prisma: {
      product: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      productVariation: {
        deleteMany: vi.fn(),
      },
      productImage: {
        deleteMany: vi.fn(),
      },
    },
  };
});

import { prisma } from '../../db.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createProduct', () => {
  it('should create a product with nested variations and images', async () => {
    const input = {
      name: 'Test Product',
      description: 'A great product',
      categoryId: 'cat-1',
      basePrice: 99.99,
      brand: 'TestBrand',
      variations: [{ sku: 'SKU1', color: 'Red', stockQty: 10 }],
      images: [{ url: 'http://example.com/img.jpg', altText: 'Product image' }],
    };
    const created = {
      id: 'prod-1',
      ...input,
      sellerId: 'seller-1',
      slug: 'test-product-123',
      status: 'DRAFT',
    } as any;
    vi.mocked(prisma.product.create).mockResolvedValue(created);

    const result = await createProduct('seller-1', input);
    expect(result.slug).toContain('test-product');
    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sellerId: 'seller-1',
          variations: {
            create: [{ sku: 'SKU1', color: 'Red', priceModifier: 0, stockQty: 10, size: null }],
          },
          images: {
            create: [{ url: 'http://example.com/img.jpg', altText: 'Product image', sortOrder: 0 }],
          },
        }),
      }),
    );
  });
});

describe('getSellerProducts', () => {
  it('should return products with filters', async () => {
    const mockProducts = [{ id: 'p1', name: 'Prod', variations: [], images: [] }];
    vi.mocked(prisma.product.findMany).mockResolvedValue(mockProducts as any);
    const result = await getSellerProducts('seller-1');
    expect(result).toEqual(mockProducts);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { sellerId: 'seller-1' },
        include: { variations: true, images: true },
        orderBy: { createdAt: 'desc' },
      }),
    );
  });
});

describe('getProductById', () => {
  it('should return product if owned by seller', async () => {
    const product = { id: 'p1', sellerId: 'seller-1', name: 'Prod', variations: [], images: [] };
    vi.mocked(prisma.product.findUnique).mockResolvedValue(product as any);
    const result = await getProductById('p1', 'seller-1');
    expect(result).toEqual(product);
  });

  it('should throw if product not found', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue(null);
    await expect(getProductById('bad', 'seller-1')).rejects.toThrow('Product not found');
  });

  it('should throw if product belongs to another seller', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue({ id: 'p1', sellerId: 'other' } as any);
    await expect(getProductById('p1', 'seller-1')).rejects.toThrow('Product not found');
  });
});

describe('updateProduct', () => {
  it('should update product and replace variations/images when provided', async () => {
    const existing = { id: 'p1', sellerId: 'seller-1', name: 'Old' };
    vi.mocked(prisma.product.findUnique).mockResolvedValue(existing as any);
    vi.mocked(prisma.productVariation.deleteMany).mockResolvedValue({ count: 0 });
    vi.mocked(prisma.productImage.deleteMany).mockResolvedValue({ count: 0 });
    const updated = {
      id: 'p1',
      sellerId: 'seller-1',
      name: 'New',
      variations: [],
      images: [],
    } as any;
    vi.mocked(prisma.product.update).mockResolvedValue(updated);

    const result = await updateProduct('p1', 'seller-1', {
      name: 'New',
      variations: [{ sku: 'NEWSKU', stockQty: 5 }],
      images: [],
    });
    expect(result.name).toBe('New');
    expect(prisma.productVariation.deleteMany).toHaveBeenCalled();
    expect(prisma.productImage.deleteMany).toHaveBeenCalled();
    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: expect.objectContaining({
          name: 'New',
          variations: {
            create: [{ sku: 'NEWSKU', size: null, color: null, priceModifier: 0, stockQty: 5 }],
          },
          images: { create: [] },
        }),
      }),
    );
  });

  it('should throw if product not owned', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue({ id: 'p1', sellerId: 'other' } as any);
    await expect(updateProduct('p1', 'seller-1', { name: 'New' })).rejects.toThrow(
      'Product not found',
    );
  });
});

describe('deleteProduct', () => {
  it('should delete product after verifying ownership', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue({
      id: 'p1',
      sellerId: 'seller-1',
    } as any);
    vi.mocked(prisma.product.delete).mockResolvedValue({} as any);
    await expect(deleteProduct('p1', 'seller-1')).resolves.toBeUndefined();
    expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
  });

  it('should throw if product not owned', async () => {
    vi.mocked(prisma.product.findUnique).mockResolvedValue({ id: 'p1', sellerId: 'other' } as any);
    await expect(deleteProduct('p1', 'seller-1')).rejects.toThrow('Product not found');
  });
});
