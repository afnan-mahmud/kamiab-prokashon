/**
 * WooCommerce → MongoDB Customer Migration
 *
 * Usage:
 *   1. phpMyAdmin থেকে নিচের SQL query run করে CSV export করুন → ফাইলের নাম দিন wc_customers.csv
 *   2. ফাইলটা এই script-এর পাশে রাখুন: apps/api/src/scripts/wc_customers.csv
 *   3. Run: pnpm --filter api migrate:customers
 *
 * phpMyAdmin SQL query:
 *   SELECT
 *     u.ID, u.user_email, u.display_name, u.user_registered,
 *     MAX(CASE WHEN m.meta_key='billing_first_name' THEN m.meta_value END) AS first_name,
 *     MAX(CASE WHEN m.meta_key='billing_last_name' THEN m.meta_value END) AS last_name,
 *     MAX(CASE WHEN m.meta_key='billing_phone' THEN m.meta_value END) AS phone,
 *     MAX(CASE WHEN m.meta_key='billing_address_1' THEN m.meta_value END) AS address,
 *     MAX(CASE WHEN m.meta_key='billing_city' THEN m.meta_value END) AS city,
 *     MAX(CASE WHEN m.meta_key='billing_state' THEN m.meta_value END) AS area,
 *     MAX(CASE WHEN m.meta_key='_order_count' THEN m.meta_value END) AS order_count,
 *     MAX(CASE WHEN m.meta_key='_money_spent' THEN m.meta_value END) AS total_spent,
 *     MAX(CASE WHEN m.meta_key='last_update' THEN m.meta_value END) AS last_order_ts
 *   FROM wp_users u
 *   JOIN wp_usermeta m ON u.ID = m.user_id
 *   GROUP BY u.ID, u.user_email, u.display_name, u.user_registered
 *   HAVING phone IS NOT NULL AND phone != ''
 *   ORDER BY u.ID;
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { Customer } from '../models/Customer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Phone normalization ──────────────────────────────────────────────────────
// Bangladesh numbers: 01XXXXXXXXX (11 digits) or +8801XXXXXXXXX
function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  // strip spaces, dashes, parentheses
  let p = raw.replace(/[\s\-().+]/g, '');
  // remove country code prefix
  if (p.startsWith('880')) p = '0' + p.slice(3);
  if (p.startsWith('8801')) p = '0' + p.slice(3); // handles 8801...
  // must be 11-digit BD mobile
  if (!/^01[3-9]\d{8}$/.test(p)) return null;
  return p;
}

// ─── Parse CSV (handles quoted fields with commas) ────────────────────────────
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

type CSVRow = Record<string, string | undefined>;

function parseCSV(content: string): CSVRow[] {
  const lines = content.split(/\r?\n/).filter((l): l is string => l.length > 0);
  if (lines.length < 2) return [];
  const headerLine = lines[0] as string;
  const headers = parseCSVLine(headerLine).map(h => h.replace(/^"|"$/g, '').toLowerCase().trim());
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row: CSVRow = {};
    headers.forEach((h, i) => { row[h] = (values[i] ?? '').replace(/^"|"$/g, '').trim(); });
    return row;
  });
}

function col(row: CSVRow, key: string): string {
  return row[key] ?? '';
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function migrate() {
  const csvPath = path.join(__dirname, 'wc_customers.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ File not found: ${csvPath}`);
    console.error('   phpMyAdmin থেকে CSV export করে এই path-এ রাখুন।');
    process.exit(1);
  }

  console.log('🔌 MongoDB-তে connect হচ্ছে...');
  await mongoose.connect(env.MONGODB_URI);
  console.log('✅ Connected to MongoDB (database: cholonbil)');

  const raw = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(raw);
  console.log(`📋 CSV-তে মোট rows: ${rows.length}`);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const skippedPhones: string[] = [];

  for (const row of rows) {
    const phone = normalizePhone(col(row, 'phone'));

    if (!phone) {
      skipped++;
      skippedPhones.push(col(row, 'phone') || '(empty)');
      continue;
    }

    // নাম: billing first+last name, তারপর display_name fallback
    const firstName = col(row, 'first_name');
    const lastName = col(row, 'last_name');
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()
      || col(row, 'display_name')
      || 'Unknown';

    const address = col(row, 'address');
    const city = col(row, 'city');
    const area = col(row, 'area') || city;

    const totalOrders = parseInt(col(row, 'order_count') || '0', 10) || 0;
    const totalSpent = parseFloat(col(row, 'total_spent') || '0') || 0;

    // last_order_ts is a Unix timestamp from WooCommerce
    const lastOrderTsStr = col(row, 'last_order_ts');
    const lastOrderTs = lastOrderTsStr ? parseInt(lastOrderTsStr, 10) : null;
    const lastOrderAt = lastOrderTs && lastOrderTs > 0
      ? new Date(lastOrderTs * 1000)
      : null;

    const registeredStr = col(row, 'user_registered');
    const registeredAt = registeredStr ? new Date(registeredStr) : new Date();
    const firstOrderAt = totalOrders > 0 ? registeredAt : null;

    const emailVal = col(row, 'user_email');
    const doc = {
      name: fullName,
      email: emailVal || undefined,
      addresses: address
        ? [{ label: 'Home', address, city: city || 'ঢাকা', area: area || city || 'ঢাকা', isDefault: true }]
        : [],
      totalOrders,
      totalSpent: Math.round(totalSpent),
      firstOrderAt,
      lastOrderAt,
      notes: '',
      deletedAt: null,
      createdAt: registeredAt,
    };

    const result = await Customer.findOneAndUpdate(
      { phone },
      { $setOnInsert: { phone, createdAt: registeredAt }, $set: doc },
      { upsert: true, new: true, rawResult: true },
    );

    // @ts-ignore
    if (result.lastErrorObject?.updatedExisting) updated++;
    else inserted++;
  }

  console.log('\n📊 Migration সম্পন্ন:');
  console.log(`   ✅ নতুন insert: ${inserted}`);
  console.log(`   🔄 Update (আগে থেকে ছিল): ${updated}`);
  console.log(`   ⚠️  Skip (invalid phone): ${skipped}`);
  if (skippedPhones.length > 0) {
    console.log('\n   Skip হওয়া phone numbers (প্রথম ২০টা):');
    skippedPhones.slice(0, 20).forEach(p => console.log(`   - "${p}"`));
  }

  await mongoose.disconnect();
  console.log('\n🎉 Done! MongoDB Atlas-এ cholonbil.customers collection চেক করুন।');
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
