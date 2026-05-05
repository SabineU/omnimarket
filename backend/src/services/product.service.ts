// backend/src/services/product.service.ts
// Business logic for seller product management.
// Every function takes the authenticated seller's ID to enforce ownership.

import { prisma } from '../db.js';
import type { Product, ProductVariation, ProductImage } from '@prisma/client';
import type { Prisma } from '@prisma/client';

/** Data required to create a product */
export interface CreateProductData {
  name: string;
  description: string;
  categoryId: string;
  basePrice: number;
  brand?: string;
  variations?: {
    sku: string;
    size?: string;
    color?: string;
    priceModifier?: number;
    stockQty?: number;
  }[];
  images?: {
    url: string;
    altText: string;
    sortOrder?: number;
  }[];
}

/** Allowed fields for a partial update */
export interface UpdateProductData extends Partial<CreateProductData> {}

/**
 * Create a new product. Automatically associates it with the seller
 * and creates nested variations and images in a single Prisma call.
 */
export async function createProduct(
  sellerId: string,
  data: CreateProductData,
): Promise<Product & { variations: ProductVariation[]; images: ProductImage[] }> {
  return prisma.product.create({
    data: {
      sellerId,
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      basePrice: data.basePrice,
      brand: data.brand,
      slug: data.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
      status: 'DRAFT',
      variations: {
        create: (data.variations ?? []).map((v) => ({
          sku: v.sku,
          size: v.size ?? null,
          color: v.color ?? null,
          priceModifier: v.priceModifier ?? 0,
          stockQty: v.stockQty ?? 0,
        })),
      },
      images: {
        create: (data.images ?? []).map((img, index) => ({
          url: img.url,
          altText: img.altText,
          sortOrder: img.sortOrder ?? index,
        })),
      },
    },
    include: { variations: true, images: true },
  });
}

/**
 * Return all products belonging to the seller, newest first.
 */
export async function getSellerProducts(
  sellerId: string,
): Promise<(Product & { variations: ProductVariation[]; images: ProductImage[] })[]> {
  return prisma.product.findMany({
    where: { sellerId },
    include: { variations: true, images: true },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Find a single product by ID, ensuring it belongs to the given seller.
 * Throws if not found or not owned.
 */
export async function getProductById(
  productId: string,
  sellerId: string,
): Promise<Product & { variations: ProductVariation[]; images: ProductImage[] }> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { variations: true, images: true },
  });
  if (!product || product.sellerId !== sellerId) {
    throw new Error('Product not found');
  }
  return product;
}

/**
 * Update an existing product. Variations and images are replaced entirely
 * when provided (delete old ones and create new ones).
 */
export async function updateProduct(
  productId: string,
  sellerId: string,
  data: UpdateProductData,
): Promise<Product & { variations: ProductVariation[]; images: ProductImage[] }> {
  // Verify ownership first
  await getProductById(productId, sellerId);

  // Build the update payload using the Prisma generated type
  const updatePayload: Prisma.ProductUpdateInput = {};

  // Copy scalar fields
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.description !== undefined) updatePayload.description = data.description;
  if (data.basePrice !== undefined) updatePayload.basePrice = data.basePrice;
  if (data.brand !== undefined) updatePayload.brand = data.brand;

  // Handle category change – must use relation connection
  if (data.categoryId !== undefined) {
    updatePayload.category = { connect: { id: data.categoryId } };
  }

  // If variations are provided, delete existing and create new ones
  if (data.variations) {
    await prisma.productVariation.deleteMany({ where: { productId } });
    updatePayload.variations = {
      create: data.variations.map((v) => ({
        sku: v.sku,
        size: v.size ?? null,
        color: v.color ?? null,
        priceModifier: v.priceModifier ?? 0,
        stockQty: v.stockQty ?? 0,
      })),
    };
  }

  // If images are provided, delete existing and create new ones
  if (data.images) {
    await prisma.productImage.deleteMany({ where: { productId } });
    updatePayload.images = {
      create: data.images.map((img, index) => ({
        url: img.url,
        altText: img.altText,
        sortOrder: img.sortOrder ?? index,
      })),
    };
  }

  return prisma.product.update({
    where: { id: productId },
    data: updatePayload,
    include: { variations: true, images: true },
  });
}

/**
 * Delete a product (cascade removes variations and images automatically).
 */
export async function deleteProduct(productId: string, sellerId: string): Promise<void> {
  await getProductById(productId, sellerId);
  await prisma.product.delete({ where: { id: productId } });
}
