import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Product } from '../models/Product.js';

async function migrate() {
  console.info('🔄 Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);
  console.info('✅ Connected');

  const products = await Product.find({ deletedAt: null }).lean();
  let updated = 0;

  console.info(`\n📦 Found ${products.length} active products. Migrating...\n`);

  for (const product of products) {
    // poolStock = sum of (variant.stock × variant.weight) across all variants
    // This converts existing per-variant unit counts into kg
    const poolStockKg = product.variants.reduce(
      (sum, v) => sum + (v.stock ?? 0) * (v.weight ?? 0),
      0,
    );

    // reorderPoint = max of (variant.reorderPoint × variant.weight) — most conservative
    const reorderPoint = product.variants.reduce(
      (max, v) => Math.max(max, (v.reorderPoint ?? 0) * (v.weight ?? 0)),
      0,
    );

    await Product.updateOne(
      { _id: product._id },
      {
        $set: {
          poolStock: poolStockKg,
          reorderPoint: reorderPoint,
        },
      },
    );

    console.info(`  ✓ ${product.name}: poolStock=${poolStockKg}kg  reorderPoint=${reorderPoint}kg`);
    updated++;
  }

  console.info(`\n🎉 Migration complete. Updated ${updated} products.`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
