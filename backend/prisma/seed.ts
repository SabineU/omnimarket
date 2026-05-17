// backend/prisma/seed.ts
// Seed script for OmniMarket – populates the database with initial data.
// Run with: pnpm seed
// Cleans dependent data in FK‑safe order, then seeds fresh.

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';

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

  // ---------------------------------------------------------------------------
  // 0. Clean up old data in FK‑safe order
  // ---------------------------------------------------------------------------
  await prisma.payment.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.couponUsage.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.sellerProfile.deleteMany({});
  await prisma.productImage.deleteMany({});
  await prisma.productVariation.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.coupon.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('🧹 Old data cleaned');

  // -------------------------------------------------------------------
  // 1. Create test users (customer, seller, admin)
  // -------------------------------------------------------------------
  const passwordHash = await bcrypt.hash('Password123!', 12);

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
  // 2. Create category tree
  // -------------------------------------------------------------------
  const electronics = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: { name: 'Electronics', slug: 'electronics' },
  });

  const computers = await prisma.category.upsert({
    where: { slug: 'computers-laptops' },
    update: {},
    create: { name: 'Computers & Laptops', slug: 'computers-laptops', parentId: electronics.id },
  });

  await prisma.category.upsert({
    where: { slug: 'phones-tablets' },
    update: {},
    create: { name: 'Phones & Tablets', slug: 'phones-tablets', parentId: electronics.id },
  });

  const fashion = await prisma.category.upsert({
    where: { slug: 'fashion' },
    update: {},
    create: { name: 'Fashion', slug: 'fashion' },
  });

  const mensClothing = await prisma.category.upsert({
    where: { slug: 'mens-clothing' },
    update: {},
    create: { name: 'Men’s Clothing', slug: 'mens-clothing', parentId: fashion.id },
  });

  await prisma.category.upsert({
    where: { slug: 'womens-clothing' },
    update: {},
    create: { name: 'Women’s Clothing', slug: 'womens-clothing', parentId: fashion.id },
  });

  const homeGarden = await prisma.category.upsert({
    where: { slug: 'home-garden' },
    update: {},
    create: { name: 'Home & Garden', slug: 'home-garden' },
  });

  console.log('✅ Categories created');

  // -------------------------------------------------------------------
  // 3. Create demo products
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
            url: 'https://picsum.photos/seed/macbook1/800',
            altText: 'MacBook Pro front view',
            sortOrder: 0,
          },
          {
            url: 'https://picsum.photos/seed/macbook2/800',
            altText: 'MacBook Pro side view',
            sortOrder: 1,
          },
        ],
      },
      variations: {
        create: [
          { sku: 'MB16-SILVER-512', color: 'Silver', priceModifier: 0, stockQty: 50 },
          { sku: 'MB16-SPACE-512', color: 'Space Gray', priceModifier: 0, stockQty: 30 },
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
          { url: 'https://picsum.photos/seed/tshirt1/800', altText: 'T-Shirt front', sortOrder: 0 },
        ],
      },
      variations: {
        create: [
          { sku: 'TS-S-BLK', size: 'S', color: 'Black', priceModifier: 0, stockQty: 100 },
          { sku: 'TS-M-BLK', size: 'M', color: 'Black', priceModifier: 0, stockQty: 150 },
          { sku: 'TS-L-BLK', size: 'L', color: 'Black', priceModifier: 0, stockQty: 120 },
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
            url: 'https://picsum.photos/seed/garden1/800',
            altText: 'Garden chair set in garden',
            sortOrder: 0,
          },
        ],
      },
      variations: {
        create: [{ sku: 'GC-ACACIA', color: 'Acacia', priceModifier: 0, stockQty: 20 }],
      },
    },
  });

  console.log('✅ Demo products created');

  // -------------------------------------------------------------------
  // 4. Seed a test coupon
  // -------------------------------------------------------------------
  await prisma.coupon.upsert({
    where: { code: 'SAVE10' },
    update: {},
    create: {
      code: 'SAVE10',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minCartAmount: 0,
      usageLimit: 100,
      usedCount: 0, // correct field name from your Prisma schema
      expiresAt: new Date('2027-12-31'),
    },
  });
  console.log('✅ Test coupon created: SAVE10');

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
