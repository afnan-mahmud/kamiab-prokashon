import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Product } from '../models/Product.js';

async function migrate() {
  console.info('🔄 Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);
  console.info('✅ Connected');

  // Include all products (including soft-deleted) — this is a schema migration, not a business operation
  const products = await Product.find({}).lean();
  let updated = 0;

  console.info(`\n📦 Found ${products.length} products (including deleted). Migrating...\n`);

  for (const product of products) {
    // poolStock = sum of (variant.stock × variant.weight) across all variants
    // This converts existing per-variant unit counts into kg
    // Round to 3 decimal places (gram precision) to avoid floating-point accumulation errors
    const poolStockKg = Math.round(
      product.variants.reduce((sum, v) => sum + (v.stock ?? 0) * (v.weight ?? 0), 0) * 1000,
    ) / 1000;

    // reorderPoint = max of (variant.reorderPoint × variant.weight) — most conservative
    // Round to 3 decimal places for consistency
    const reorderPoint = Math.round(
      product.variants.reduce(
        (max, v) => Math.max(max, (v.reorderPoint ?? 0) * (v.weight ?? 0)),
        0,
      ) * 1000,
    ) / 1000;

    // Warn for zero-weight variants with stock > 0
    const zeroWeightWithStock = product.variants.filter(
      (v) => (v.weight ?? 0) === 0 && (v.stock ?? 0) > 0,
    );
    if (zeroWeightWithStock.length > 0) {
      console.warn(
        `  ⚠️  ${product.name}: ${zeroWeightWithStock.length} variant(s) have weight=0 with stock>0 — their stock was NOT included in poolStock`,
      );
    }

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
  mongoose.disconnect().finally(() => process.exit(1));
});
