/**
 * WooCommerce → MongoDB Full Migration (Orders + Customers)
 *
 * Reads CSV exports from wordpressDAta/ folder and migrates:
 * - Customers (phone-based upsert)
 * - Orders (with line items, addresses, delivery charges)
 *
 * Safety guarantees:
 * - Does NOT affect stock (no stock movements created)
 * - Uses WP-{id} order numbers (no collision with CBO-YYYY-NNNN)
 * - Idempotent: can run multiple times safely (skips existing orders)
 * - Does not modify existing data
 *
 * Usage:
 *   pnpm --filter api migrate:wordpress
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Customer } from '../models/Customer.js';
import { Order } from '../models/Order.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../../../wordpressDAta');

// Fixed placeholder ObjectIds for legacy order items (won't match any real product)
const LEGACY_PRODUCT_ID = new mongoose.Types.ObjectId('000000000000000000000001');
const LEGACY_VARIANT_ID = new mongoose.Types.ObjectId('000000000000000000000002');

// ─── CSV Parser ──────────────────────────────────────────────────────────────
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

type CSVRow = Record<string, string>;

function parseCSV(filePath: string): CSVRow[] {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length < 2) return [];
  const headers = parseCSVLine(lines[0]!).map((h) => h.replace(/^"|"$/g, '').trim());
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const row: CSVRow = {};
    headers.forEach((h, i) => {
      let val = (values[i] ?? '').trim();
      // Remove surrounding quotes
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      // Handle NULL
      if (val === 'NULL' || val === 'null') val = '';
      row[h] = val;
    });
    return row;
  });
}

// ─── Phone Normalization ─────────────────────────────────────────────────────
function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let p = raw.replace(/[\s\-().+]/g, '');
  if (p.startsWith('880')) p = '0' + p.slice(3);
  if (p.startsWith('8801')) p = '0' + p.slice(3);
  // Must be 11-digit BD mobile
  if (/^01[3-9]\d{8}$/.test(p)) return p;
  return null;
}

// ─── Status Mapping ──────────────────────────────────────────────────────────
function mapStatus(wpStatus: string): string {
  switch (wpStatus) {
    case 'wc-completed':
      return 'Confirmed';
    case 'wc-cancelled':
      return 'Cancelled';
    case 'wc-processing':
      return 'Pending';
    case 'trash':
      return 'Cancelled';
    default:
      return 'Pending';
  }
}

function mapPaymentStatus(wpStatus: string): string {
  if (wpStatus === 'wc-completed') return 'paid';
  if (wpStatus === 'wc-cancelled') return 'failed';
  return 'pending';
}

// ─── Weight Extraction from product name ─────────────────────────────────────
function extractWeightKg(name: string): number {
  // Try to extract weight in kg from product name
  // Patterns: "৫কেজি", "5kg", "১০ কেজি", "500 গ্রাম", "৫০০গ্রাম", "হাফ কেজি"
  const bnDigits: Record<string, string> = {
    '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
    '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
  };
  const normalized = name.replace(/[০-৯]/g, (ch) => bnDigits[ch] || ch);

  // "হাফ কেজি" = 0.5
  if (/হাফ\s*কেজি/i.test(name)) return 0.5;

  // X কেজি / Xkg / X-কেজি
  const kgMatch = normalized.match(/(\d+(?:\.\d+)?)\s*[-]?\s*(?:কেজি|kg)/i);
  if (kgMatch) return parseFloat(kgMatch[1]!);

  // X গ্রাম / X মি.লি.
  const gramMatch = normalized.match(/(\d+)\s*(?:গ্রাম|গ্রা|মি\.লি\.)/i);
  if (gramMatch) return parseInt(gramMatch[1]!, 10) / 1000;

  // X লিটার
  const literMatch = normalized.match(/(\d+)\s*লিটার/i);
  if (literMatch) return parseFloat(literMatch[1]!) * 1; // 1 liter ≈ 1 kg

  return 0.5; // Default fallback
}

// ─── Delivery Location from shipping item name ──────────────────────────────
function getDeliveryLocation(shippingName: string): 'inside_dhaka' | 'outside_dhaka' {
  if (shippingName.includes('মধ্যে') || shippingName.toLowerCase().includes('inside')) {
    return 'inside_dhaka';
  }
  return 'outside_dhaka';
}

// ─── Main Migration ──────────────────────────────────────────────────────────
async function migrate() {
  console.log('🚀 WordPress → MongoDB Migration শুরু হচ্ছে...\n');

  // ── Load all CSV files ──
  console.log('📂 CSV files load হচ্ছে...');
  const orders = parseCSV(path.join(DATA_DIR, 'wp_wc_orders.csv'));
  const addresses = parseCSV(path.join(DATA_DIR, 'wp_wc_order_addresses.csv'));
  const customers = parseCSV(path.join(DATA_DIR, 'wp_wc_customer_lookup.csv'));
  const orderItems = parseCSV(path.join(DATA_DIR, 'wp_woocommerce_order_items.csv'));
  const orderItemMeta = parseCSV(path.join(DATA_DIR, 'wp_woocommerce_order_itemmeta.csv'));

  console.log(`   Orders: ${orders.length}`);
  console.log(`   Addresses: ${addresses.length}`);
  console.log(`   Customers: ${customers.length}`);
  console.log(`   Order Items: ${orderItems.length}`);
  console.log(`   Order Item Meta: ${orderItemMeta.length}`);

  // ── Build lookup maps ──
  console.log('\n🔨 Lookup maps তৈরি হচ্ছে...');

  // Address map: order_id → { billing, shipping }
  const addressMap = new Map<string, { billing?: CSVRow; shipping?: CSVRow }>();
  for (const addr of addresses) {
    const orderId = addr['order_id'] ?? '';
    if (!addressMap.has(orderId)) addressMap.set(orderId, {});
    const entry = addressMap.get(orderId)!;
    if (addr['address_type'] === 'billing') entry.billing = addr;
    else if (addr['address_type'] === 'shipping') entry.shipping = addr;
  }

  // Item meta map: order_item_id → { _product_id, _qty, _line_total, ... }
  const itemMetaMap = new Map<string, Record<string, string>>();
  for (const meta of orderItemMeta) {
    const itemId = meta['order_item_id'] ?? '';
    if (!itemMetaMap.has(itemId)) itemMetaMap.set(itemId, {});
    const entry = itemMetaMap.get(itemId)!;
    const key = meta['meta_key'] ?? '';
    const value = meta['meta_value'] ?? '';
    entry[key] = value;
  }

  // Order items grouped by order_id
  const orderItemsMap = new Map<string, Array<{ name: string; type: string; itemId: string }>>();
  for (const item of orderItems) {
    const orderId = item['order_id'] ?? '';
    if (!orderItemsMap.has(orderId)) orderItemsMap.set(orderId, []);
    orderItemsMap.get(orderId)!.push({
      name: item['order_item_name'] ?? '',
      type: item['order_item_type'] ?? '',
      itemId: item['order_item_id'] ?? '',
    });
  }

  console.log('   ✅ Maps তৈরি সম্পন্ন');

  // ── Connect to MongoDB ──
  console.log('\n🔌 MongoDB-তে connect হচ্ছে...');
  await mongoose.connect(env.MONGODB_URI);
  console.log('   ✅ Connected to MongoDB');

  // ── Check existing WP orders to make it idempotent ──
  const existingWpOrders = await Order.find(
    { orderNumber: /^WP-/ },
    { orderNumber: 1 },
  ).lean();
  const existingWpSet = new Set(existingWpOrders.map((o) => o.orderNumber));
  console.log(`   ℹ️  আগে থেকে ${existingWpSet.size} টা WP order আছে`);

  // ── Stats ──
  let customersCreated = 0;
  let customersUpdated = 0;
  let customersSkipped = 0;
  let ordersCreated = 0;
  let ordersSkipped = 0;
  let ordersFailed = 0;

  // ── Phase 1: Migrate Orders (with Customer upsert) ──
  console.log('\n📦 Orders migrate হচ্ছে...');

  // Filter: only shop_order type, skip trash
  const validOrders = orders.filter(
    (o) => o['type'] === 'shop_order' && o['status'] !== 'trash',
  );
  console.log(`   প্রসেস করা হবে: ${validOrders.length} orders`);

  const BATCH_SIZE = 500;
  let processed = 0;

  for (let i = 0; i < validOrders.length; i += BATCH_SIZE) {
    const batch = validOrders.slice(i, i + BATCH_SIZE);
    const orderDocs: Array<Record<string, unknown>> = [];

    for (const wpOrder of batch) {
      const wpOrderId = wpOrder['id'] ?? '';
      const orderNumber = `WP-${wpOrderId}`;

      // Skip if already exists
      if (existingWpSet.has(orderNumber)) {
        ordersSkipped++;
        continue;
      }

      // ── Get billing address for customer info ──
      const addrEntry = addressMap.get(wpOrderId);
      const billing = addrEntry?.billing;
      const shipping = addrEntry?.shipping;

      const customerName =
        [billing?.['first_name'], billing?.['last_name']].filter(Boolean).join(' ').trim() ||
        'Unknown';
      const phone = normalizePhone(billing?.['phone'] ?? '');
      const address = billing?.['address_1'] || shipping?.['address_1'] || '';
      const city = billing?.['city'] || shipping?.['city'] || '';

      // If no valid phone, create a placeholder phone from order id
      const effectivePhone = phone || `wp-order-${wpOrderId}`;

      // ── Customer upsert ──
      let customerId: mongoose.Types.ObjectId;
      try {
        const orderDate = wpOrder['date_created_gmt']
          ? new Date(wpOrder['date_created_gmt'] + 'Z')
          : new Date();
        const totalAmount = parseFloat(wpOrder['total_amount'] ?? '0') || 0;

        if (phone) {
          // Valid phone — proper customer upsert
          const customer = await Customer.findOneAndUpdate(
            { phone },
            {
              $setOnInsert: {
                phone,
                name: customerName,
                firstOrderAt: orderDate,
                addresses: address
                  ? [{ label: 'Home', address, city: city || 'Unknown', area: city || 'Unknown', isDefault: true }]
                  : [],
                notes: '',
                deletedAt: null,
              },
              $set: { lastOrderAt: orderDate },
              $inc: { totalOrders: 1, totalSpent: totalAmount },
            },
            { upsert: true, new: true },
          );
          customerId = customer._id as mongoose.Types.ObjectId;
          if ((customer as any).__v === 0) customersCreated++;
          else customersUpdated++;
        } else {
          // No valid phone — create with placeholder phone
          const customer = await Customer.findOneAndUpdate(
            { phone: effectivePhone },
            {
              $setOnInsert: {
                phone: effectivePhone,
                name: customerName,
                firstOrderAt: orderDate,
                addresses: address
                  ? [{ label: 'Home', address, city: city || 'Unknown', area: city || 'Unknown', isDefault: true }]
                  : [],
                notes: 'WordPress import - no valid phone',
                deletedAt: null,
              },
              $set: { lastOrderAt: orderDate },
              $inc: { totalOrders: 1, totalSpent: totalAmount },
            },
            { upsert: true, new: true },
          );
          customerId = customer._id as mongoose.Types.ObjectId;
          customersSkipped++;
        }
      } catch (err) {
        // Duplicate key race condition — try to find existing
        const existing = await Customer.findOne({ phone: phone || effectivePhone }).lean();
        if (existing) {
          customerId = existing._id as mongoose.Types.ObjectId;
        } else {
          console.error(`   ⚠️ Customer create failed for order ${wpOrderId}:`, err);
          ordersFailed++;
          continue;
        }
      }

      // ── Build line items ──
      const items = orderItemsMap.get(wpOrderId) ?? [];
      const lineItems = items.filter((it) => it.type === 'line_item');
      const shippingItem = items.find((it) => it.type === 'shipping');

      const mongoItems: Array<Record<string, unknown>> = [];
      let subtotal = 0;

      for (const lineItem of lineItems) {
        const meta = itemMetaMap.get(lineItem.itemId) ?? {};
        const qty = parseInt(meta['_qty'] ?? '1', 10) || 1;
        const lineTotal = parseFloat(meta['_line_total'] ?? '0') || 0;
        const price = qty > 0 ? lineTotal / qty : lineTotal;
        const weight = extractWeightKg(lineItem.name);

        mongoItems.push({
          product: LEGACY_PRODUCT_ID,
          productName: lineItem.name,
          variantId: LEGACY_VARIANT_ID,
          variantLabel: lineItem.name,
          price: Math.round(price),
          quantity: qty,
          weight,
          subtotal: lineTotal,
        });

        subtotal += lineTotal;
      }

      // If no line items found, create a single placeholder item
      if (mongoItems.length === 0) {
        const totalAmount = parseFloat(wpOrder['total_amount'] ?? '0') || 0;
        mongoItems.push({
          product: LEGACY_PRODUCT_ID,
          productName: 'WordPress Order (details unavailable)',
          variantId: LEGACY_VARIANT_ID,
          variantLabel: 'N/A',
          price: totalAmount,
          quantity: 1,
          weight: 0.5,
          subtotal: totalAmount,
        });
        subtotal = totalAmount;
      }

      // ── Delivery charge ──
      let deliveryCharge = 0;
      let deliveryLocation: 'inside_dhaka' | 'outside_dhaka' = 'outside_dhaka';

      if (shippingItem) {
        const shippingMeta = itemMetaMap.get(shippingItem.itemId) ?? {};
        deliveryCharge = parseFloat(shippingMeta['cost'] ?? '0') || 0;
        deliveryLocation = getDeliveryLocation(shippingItem.name);
      } else {
        // Calculate from total - subtotal
        const totalAmount = parseFloat(wpOrder['total_amount'] ?? '0') || 0;
        deliveryCharge = Math.max(0, totalAmount - subtotal);
      }

      const total = parseFloat(wpOrder['total_amount'] ?? '0') || subtotal + deliveryCharge;
      const status = mapStatus(wpOrder['status'] ?? '');
      const paymentStatus = mapPaymentStatus(wpOrder['status'] ?? '');
      const createdAt = wpOrder['date_created_gmt']
        ? new Date(wpOrder['date_created_gmt'] + 'Z')
        : new Date();
      const updatedAt = wpOrder['date_updated_gmt']
        ? new Date(wpOrder['date_updated_gmt'] + 'Z')
        : createdAt;

      orderDocs.push({
        orderNumber,
        customer: customerId,
        customerSnapshot: {
          phone: phone || effectivePhone,
          name: customerName,
          address: address || 'N/A',
          city: city || 'N/A',
          area: city || 'N/A',
        },
        items: mongoItems,
        subtotal,
        deliveryCharge,
        deliveryLocation,
        discount: 0,
        total,
        paymentMethod: 'cash', // WordPress was all COD
        paymentStatus,
        status,
        source: 'website',
        courier: {},
        notes: wpOrder['customer_note'] || '',
        createdBy: null,
        statusHistory: [
          { status, changedBy: null, changedAt: createdAt, note: 'WordPress import' },
        ],
        createdAt,
        updatedAt,
      });
    }

    // Bulk insert orders (skip duplicates with ordered: false)
    if (orderDocs.length > 0) {
      try {
        const result = await Order.insertMany(orderDocs, { ordered: false });
        ordersCreated += result.length;
      } catch (err: any) {
        // Handle partial success (some might be duplicates)
        if (err.code === 11000 || err.insertedDocs) {
          const inserted = err.insertedDocs?.length ?? err.result?.nInserted ?? 0;
          ordersCreated += inserted;
          ordersSkipped += orderDocs.length - inserted;
        } else {
          console.error(`   ❌ Batch insert failed:`, err.message);
          ordersFailed += orderDocs.length;
        }
      }
    }

    processed += batch.length;
    if (processed % 5000 === 0 || processed === validOrders.length) {
      console.log(`   📊 Progress: ${processed}/${validOrders.length} processed`);
    }
  }

  // ── Summary ──
  console.log('\n' + '═'.repeat(60));
  console.log('📊 Migration সম্পন্ন!\n');
  console.log('   Customers:');
  console.log(`     ✅ নতুন: ${customersCreated}`);
  console.log(`     🔄 Updated: ${customersUpdated}`);
  console.log(`     ⚠️  No valid phone: ${customersSkipped}`);
  console.log('');
  console.log('   Orders:');
  console.log(`     ✅ Created: ${ordersCreated}`);
  console.log(`     ⏭️  Skipped (already exists): ${ordersSkipped}`);
  console.log(`     ❌ Failed: ${ordersFailed}`);
  console.log('');
  console.log('═'.repeat(60));
  console.log('');
  console.log('⚠️  গুরুত্বপূর্ণ তথ্য:');
  console.log('   - WP orders-এর orderNumber: WP-{id} (e.g., WP-250, WP-46975)');
  console.log('   - নতুন orders: CBO-YYYY-NNNN format-এ continue হবে');
  console.log('   - Stock affect হয়নি — কোনো stock movement তৈরি হয়নি');
  console.log('   - Product reference: placeholder ID ব্যবহার করা হয়েছে');
  console.log('');

  await mongoose.disconnect();
  console.log('🎉 Done! MongoDB collection চেক করুন।');
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
