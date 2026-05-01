// backend/prisma/seed.ts
// Seed script for OmniMarket – populates the database with initial data.
// Run with: pnpm seed

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';

// Load .env manually (Prisma's seed command may not auto-load it)
dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  console.log('🌱 Seeding OmniMarket database...');

  // -------------------------------------------------------------------
  // 1. Create test users (customer, seller, admin)
  // -------------------------------------------------------------------
  const passwordHash = await bcrypt.hash('Password123!', 12);

  // customer – we don't need to keep the returned object
  await prisma.user.upsert({
    where: { email: 'customer@omnimarket.com' },
    update: {},
    create: {
      email: 'customer@omnimarket.com',
      passwordHash,
      name: 'Alice Customer',
      role: 'CUSTOMER',
    },
  });

  // seller – we need the sellerUser to create the seller profile
  const sellerUser = await prisma.user.upsert({
    where: { email: 'seller@omnimarket.com' },
    update: {},
    create: {
      email: 'seller@omnimarket.com',
      passwordHash,
      name: 'Bob Seller',
      role: 'SELLER',
    },
  });

  // Create the seller's store profile
  await prisma.sellerProfile.upsert({
    where: { userId: sellerUser.id },
    update: {},
    create: {
      userId: sellerUser.id,
      storeName: 'Bob’s Electronics',
      description: 'Your one-stop shop for gadgets and accessories',
      isApproved: true,
    },
  });

  // admin – we don't need the returned object
  await prisma.user.upsert({
    where: { email: 'admin@omnimarket.com' },
    update: {},
    create: {
      email: 'admin@omnimarket.com',
      passwordHash,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  console.log('✅ Users created');

  // -------------------------------------------------------------------
  // 2. Create category tree (top-level + children)
  //    We use upsert to be idempotent (safe to run multiple times)
  // -------------------------------------------------------------------
  const electronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: { name: 'Electronics', slug: 'electronics' },
  });

  const computers = await prisma.category.upsert({
    where: { slug: 'computers-laptops' },
    update: {},
    create: {
      name: 'Computers & Laptops',
      slug: 'computers-laptops',
      parentId: electronics.id,
    },
  });

  // phones – created but not used later, so we don't capture the return value
  await prisma.category.upsert({
    where: { slug: 'phones-tablets' },
    update: {},
    create: {
      name: 'Phones & Tablets',
      slug: 'phones-tablets',
      parentId: electronics.id,
    },
  });

  const fashion = await prisma.category.upsert({
    where: { slug: 'fashion' },
    update: {},
    create: { name: 'Fashion', slug: 'fashion' },
  });

  const mensClothing = await prisma.category.upsert({
    where: { slug: 'mens-clothing' },
    update: {},
    create: {
      name: 'Men’s Clothing',
      slug: 'mens-clothing',
      parentId: fashion.id,
    },
  });

  // womensClothing – created but not used later
  await prisma.category.upsert({
    where: { slug: 'womens-clothing' },
    update: {},
    create: {
      name: 'Women’s Clothing',
      slug: 'womens-clothing',
      parentId: fashion.id,
    },
  });

  const homeGarden = await prisma.category.upsert({
    where: { slug: 'home-garden' },
    update: {},
    create: { name: 'Home & Garden', slug: 'home-garden' },
  });

  console.log('✅ Categories created');

  // -------------------------------------------------------------------
  // 3. Create demo products with variations and images
  //    We don't need the return values, so we just execute the upserts.
  // -------------------------------------------------------------------
  await prisma.product.upsert({
    where: { slug: 'macbook-pro-16' },
    update: {},
    create: {
      name: 'MacBook Pro 16"',
      slug: 'macbook-pro-16',
      description: 'Apple M3 Pro chip, 18GB RAM, 512GB SSD – stunning Liquid Retina XDR display.',
      basePrice: 2499.99,
      brand: 'Apple',
      status: 'ACTIVE',
      categoryId: computers.id,
      sellerId: sellerUser.id,
      images: {
        create: [
          {
            url: 'https://via.placeholder.com/800?text=MacBook+Pro+1',
            altText: 'MacBook Pro front view',
            sortOrder: 0,
          },
          {
            url: 'https://via.placeholder.com/800?text=MacBook+Pro+2',
            altText: 'MacBook Pro side view',
            sortOrder: 1,
          },
        ],
      },
      variations: {
        create: [
          {
            sku: 'MB16-SILVER-512',
            color: 'Silver',
            priceModifier: 0,
            stockQty: 50,
          },
          {
            sku: 'MB16-SPACE-512',
            color: 'Space Gray',
            priceModifier: 0,
            stockQty: 30,
          },
        ],
      },
    },
  });

  await prisma.product.upsert({
    where: { slug: 'cotton-t-shirt' },
    update: {},
    create: {
      name: 'Premium Cotton T-Shirt',
      slug: 'cotton-t-shirt',
      description: 'Soft, breathable 100% organic cotton. Available in multiple sizes.',
      basePrice: 29.99,
      brand: 'EcoThreads',
      status: 'ACTIVE',
      categoryId: mensClothing.id,
      sellerId: sellerUser.id,
      images: {
        create: [
          {
            url: 'https://via.placeholder.com/800?text=T-Shirt+1',
            altText: 'T-Shirt front',
            sortOrder: 0,
          },
        ],
      },
      variations: {
        create: [
          {
            sku: 'TS-S-BLK',
            size: 'S',
            color: 'Black',
            priceModifier: 0,
            stockQty: 100,
          },
          {
            sku: 'TS-M-BLK',
            size: 'M',
            color: 'Black',
            priceModifier: 0,
            stockQty: 150,
          },
          {
            sku: 'TS-L-BLK',
            size: 'L',
            color: 'Black',
            priceModifier: 0,
            stockQty: 120,
          },
        ],
      },
    },
  });

  await prisma.product.upsert({
    where: { slug: 'wooden-garden-chair-set' },
    update: {},
    create: {
      name: 'Wooden Garden Chair Set',
      slug: 'wooden-garden-chair-set',
      description: 'Set of 2 folding wooden chairs with acacia finish, perfect for your patio.',
      basePrice: 149.99,
      brand: 'OutdoorLiving',
      status: 'ACTIVE',
      categoryId: homeGarden.id,
      sellerId: sellerUser.id,
      images: {
        create: [
          {
            url: 'https://via.placeholder.com/800?text=Garden+Chair+1',
            altText: 'Garden chair set in garden',
            sortOrder: 0,
          },
        ],
      },
      variations: {
        create: [
          {
            sku: 'GC-ACACIA',
            color: 'Acacia',
            priceModifier: 0,
            stockQty: 20,
          },
        ],
      },
    },
  });

  console.log('✅ Demo products created');
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
