/* eslint-disable @typescript-eslint/no-explicit-any */
// backend/src/__tests__/services/category.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCategoryTree, getCategoryBySlug } from '../../services/category.service.js';

// Mock the database module
vi.mock('../../db.js', () => {
  return {
    prisma: {
      category: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
    },
  };
});

import { prisma } from '../../db.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getCategoryTree', () => {
  it('should return an empty array if no categories exist', async () => {
    vi.mocked(prisma.category.findMany).mockResolvedValue([]);
    const tree = await getCategoryTree();
    expect(tree).toEqual([]);
  });

  it('should build a nested tree from a flat list', async () => {
    const flat = [
      { id: '1', name: 'Electronics', slug: 'electronics', parentId: null, imageUrl: null },
      { id: '2', name: 'Laptops', slug: 'laptops', parentId: '1', imageUrl: null },
      { id: '3', name: 'Phones', slug: 'phones', parentId: '1', imageUrl: null },
      { id: '4', name: 'Fashion', slug: 'fashion', parentId: null, imageUrl: null },
    ];
    vi.mocked(prisma.category.findMany).mockResolvedValue(flat as any);

    const tree = await getCategoryTree();

    // Top‑level should be Electronics and Fashion
    expect(tree).toHaveLength(2);

    // Electronics should have two children
    const electronics = tree.find((c) => c.slug === 'electronics');
    expect(electronics?.children).toHaveLength(2);
    expect(electronics?.children[0].slug).toBe('laptops');

    // Fashion should have no children
    const fashion = tree.find((c) => c.slug === 'fashion');
    expect(fashion?.children).toHaveLength(0);
  });
});

describe('getCategoryBySlug', () => {
  it('should return the category with its children', async () => {
    const mainCategory = {
      id: '1',
      name: 'Electronics',
      slug: 'electronics',
      parentId: null,
      imageUrl: null,
    };
    const children = [{ id: '2', name: 'Laptops', slug: 'laptops', parentId: '1', imageUrl: null }];

    vi.mocked(prisma.category.findUnique).mockResolvedValue(mainCategory as any);
    vi.mocked(prisma.category.findMany).mockResolvedValue(children as any);

    const result = await getCategoryBySlug('electronics');
    expect(result.name).toBe('Electronics');
    expect(result.children).toHaveLength(1);
    expect(result.children[0].slug).toBe('laptops');
  });

  it('should throw an error if the slug is not found', async () => {
    vi.mocked(prisma.category.findUnique).mockResolvedValue(null);
    await expect(getCategoryBySlug('nonexistent')).rejects.toThrow('Category not found');
  });
});
