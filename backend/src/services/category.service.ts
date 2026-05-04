// backend/src/services/category.service.ts
// Business logic for product categories – hierarchical tree structure.
// Categories are self‑referencing: each category can have a parent and children.
// Because the database table is flat, we fetch all rows and build the tree in memory.

import { prisma } from '../db.js';
import type { Category } from '@prisma/client';

/**
 * Flat category as stored in the database.
 * We extend it with a `children` field for the tree structure.
 */
export interface CategoryNode extends Category {
  children: CategoryNode[];
}

/**
 * Build a tree from a flat list of categories.
 * @param categories – all categories from the database.
 * @param parentId – the ID of the parent node (null for root).
 * @returns An array of CategoryNode with nested children.
 */
function buildTree(categories: Category[], parentId: string | null): CategoryNode[] {
  return categories
    .filter((cat) => cat.parentId === parentId)
    .map((cat) => ({
      ...cat,
      children: buildTree(categories, cat.id),
    }));
}

/**
 * Return the complete category tree.
 * Top‑level categories (parentId = null) are the roots.
 */
export async function getCategoryTree(): Promise<CategoryNode[]> {
  // Fetch every category – usually this is < 200 rows, so performance is fine.
  const allCategories = await prisma.category.findMany();

  // Build and return the tree starting from the top‑level nodes.
  return buildTree(allCategories, null);
}

/**
 * Return a single category by its URL‑friendly slug.
 * Includes the immediate children so the frontend can show a subcategory menu.
 * Throws a generic error if the slug is not found.
 */
export async function getCategoryBySlug(slug: string): Promise<CategoryNode> {
  // Find the category by its unique slug
  const category = await prisma.category.findUnique({
    where: { slug },
  });

  if (!category) {
    throw new Error('Category not found');
  }

  // Fetch the children of this category
  const children = await prisma.category.findMany({
    where: { parentId: category.id },
  });

  return {
    ...category,
    children: children.map((child) => ({
      ...child,
      children: [], // we don't fetch grandchildren here
    })),
  };
}
