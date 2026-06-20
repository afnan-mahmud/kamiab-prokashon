import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Product } from '../models/Product.js';

// Drops indexes that no longer match the schema (e.g. the old text index whose
// language_override defaulted to the book `language` field) and recreates the
// current ones. Run after changing index definitions on the Product model.
async function run() {
  console.info('🔌 Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);

  console.info('📑 Existing Product indexes:');
  console.info(await Product.collection.indexes());

  console.info('🔄 Syncing indexes...');
  const dropped = await Product.syncIndexes();
  console.info('✅ syncIndexes done. Dropped:', dropped);

  console.info('📑 Product indexes after sync:');
  console.info(await Product.collection.indexes());

  await mongoose.disconnect();
  console.info('🎉 Done.');
}

run().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
