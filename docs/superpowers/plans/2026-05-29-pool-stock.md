# Pool-Based Stock Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace per-variant unit-count stock with a single kg-pool (`poolStock`) at the product level, so ordering any variant deducts its weight × quantity from the shared pool.

**Architecture:** Add `poolStock: number` (kg) and `reorderPoint: number` (kg) to the Product model; remove `stock` and `reorderPoint` from the variant sub-schema. StockMovements now record `qty` in kg. Sale deduction is grouped by productId so one atomic `$inc` per product happens per order. The `variant` field in StockMovement stays for sales/returns (useful for reporting) but becomes null for purchases/adjustments.

**Tech Stack:** Express.js + Mongoose, Next.js + TanStack Query, Zod, TypeScript monorepo (pnpm workspaces)

---

## Files Changed / Created

| File | Action | What changes |
|------|--------|-------------|
| `apps/api/src/models/Product.ts` | Modify | Add `poolStock`, `reorderPoint` at product level; remove `stock`, `reorderPoint` from variant |
| `apps/api/src/models/StockMovement.ts` | Modify | `variant` becomes optional (not required) |
| `apps/api/src/services/stock.service.ts` | Rewrite | Pool-based deduction grouped by productId; purchase/adjust use poolStock |
| `apps/api/src/routes/admin/stock.routes.ts` | Modify | Summary uses product poolStock; add-stock removes variantId; adjust removes variantId |
| `apps/api/src/routes/public/orders.routes.ts` | Modify | Pre-check and deduction use poolStock instead of variant.stock |
| `apps/api/src/routes/admin/orders.routes.ts` | Modify | Manual order pre-check uses poolStock |
| `apps/api/src/scripts/migrate-pool-stock.ts` | Create | One-time migration: set poolStock from variant stock × weight |
| `packages/types/src/product.ts` | Modify | Add `poolStock` to Product; remove `stock`, `reorderPoint` from ProductVariant |
| `packages/types/src/stock.ts` | Modify | Remove `variantId` from AddStockInput/AdjustStockInput; update StockSummary |
| `apps/web/src/features/stock/add-stock-modal.tsx` | Rewrite | Product-only selector, qty in kg, no variant picker |
| `apps/web/src/features/stock/adjust-stock-modal.tsx` | Rewrite | Product-only selector, qty in kg, no variant picker |
| `apps/web/src/app/admin/stock/page.tsx` | Modify | Low-stock tab shows product-level poolStock; display in kg |
| `apps/web/src/features/products/product-form.tsx` | Modify | Remove `stock` and `reorderPoint` inputs from variant rows; add product-level `poolStock` + `reorderPoint` inputs |
| `apps/web/src/app/products/[slug]/page.tsx` | Modify | `inStock` uses `product.poolStock >= (selectedVariant.weight * qty)` |

---

## Task 1: Migration Script (run BEFORE any code changes go live)

> Run this against the production DB to convert existing data. Safe to run multiple times (idempotent via `$set`).

**Files:**
- Create: `apps/api/src/scripts/migrate-pool-stock.ts`

- [ ] **Step 1: Create the migration script**

```typescript
// apps/api/src/scripts/migrate-pool-stock.ts
import mongoose from 'mongoose';
import { Product } from '../models/Product.js';

const MONGODB_URI = process.env['MONGODB_URI'];
if (!MONGODB_URI) throw new Error('MONGODB_URI env var required');

async function run() {
  await mongoose.connect(MONGODB_URI!);
  console.log('Connected to MongoDB');

  const products = await Product.find({ deletedAt: null }).lean();
  let updated = 0;

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

    console.log(`  ${product.name}: poolStock=${poolStockKg}kg  reorderPoint=${reorderPoint}kg`);
    updated++;
  }

  console.log(`\nDone. Updated ${updated} products.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 2: Add run script to `apps/api/package.json`**

Open `apps/api/package.json`. In the `"scripts"` block, add:
```json
"migrate:pool-stock": "tsx src/scripts/migrate-pool-stock.ts"
```

- [ ] **Step 3: Run the migration on local/staging first**

```bash
cd apps/api
MONGODB_URI="<your-uri>" pnpm migrate:pool-stock
```

Expected output: each product listed with its calculated `poolStock` kg value.

- [ ] **Step 4: Verify a product in MongoDB**

```bash
# Connect to mongo shell or Atlas UI and check:
db.products.findOne({}, { name: 1, poolStock: 1, reorderPoint: 1, variants: 1 })
```

Expected: document has `poolStock` (number ≥ 0) and `reorderPoint` (number ≥ 0) fields.

---

## Task 2: Update Backend Model + Shared Types

**Files:**
- Modify: `apps/api/src/models/Product.ts`
- Modify: `apps/api/src/models/StockMovement.ts`
- Modify: `packages/types/src/product.ts`
- Modify: `packages/types/src/stock.ts`

- [ ] **Step 1: Update `apps/api/src/models/Product.ts`**

Remove `stock` and `reorderPoint` from `variantSchema`. Add `poolStock` and `reorderPoint` to `productSchema`.

Replace the current `IProductVariant` interface and `variantSchema` + `IProduct` + `productSchema`:

```typescript
import { Schema, model, type Document } from 'mongoose';

export interface IProductImage {
  url: string;
  publicId: string;
  alt: string;
}

export interface IProductVariant {
  label: string;
  price: number;
  sku: string;
  weight: number;
  isDefault: boolean;
}

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  images: IProductImage[];
  category: string;
  variants: (IProductVariant & { _id: import('mongoose').Types.ObjectId })[];
  poolStock: number;
  reorderPoint: number;
  isActive: boolean;
  totalSold: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const imageSchema = new Schema<IProductImage>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    alt: { type: String, default: '' },
  },
  { _id: false },
);

const variantSchema = new Schema<IProductVariant>(
  {
    label: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    sku: { type: String, trim: true, default: '' },
    weight: { type: Number, required: true, min: 0 },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    images: [imageSchema],
    category: { type: String, required: true, trim: true },
    variants: {
      type: [variantSchema],
      validate: {
        validator(v: IProductVariant[]) {
          return v.length > 0 && v.filter((x) => x.isDefault).length === 1;
        },
        message: 'Product must have at least one variant with exactly one default',
      },
    },
    poolStock: { type: Number, required: true, min: 0, default: 0 },
    reorderPoint: { type: Number, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },
    totalSold: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ category: 1 });
productSchema.index({ isActive: 1 });
productSchema.index({ name: 'text', description: 'text' });

export const Product = model<IProduct>('Product', productSchema);
```

- [ ] **Step 2: Update `apps/api/src/models/StockMovement.ts`**

Make `variant` optional (not required):

```typescript
import { Schema, model, type Document, type Types } from 'mongoose';
import type { StockMovementType } from '@kamiab/types';

export interface IStockMovement extends Document {
  type: StockMovementType;
  product: Types.ObjectId;
  variant: Types.ObjectId | null;
  qty: number;
  productName: string;
  variantLabel: string;
  unitCost: number | null;
  supplier: string | null;
  purchaseDate: Date | null;
  reference: string | null;
  orderId: Types.ObjectId | null;
  orderNumber: string | null;
  note: string;
  createdBy: Types.ObjectId | null;
  createdAt: Date;
}

const stockMovementSchema = new Schema<IStockMovement>(
  {
    type: {
      type: String,
      enum: ['purchase', 'sale', 'return_resalable', 'return_damaged', 'adjustment'],
      required: true,
    },
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variant: { type: Schema.Types.ObjectId, default: null },
    qty: { type: Number, required: true },
    productName: { type: String, required: true },
    variantLabel: { type: String, default: '' },
    unitCost: { type: Number, default: null },
    supplier: { type: String, default: null },
    purchaseDate: { type: Date, default: null },
    reference: { type: String, default: null },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    orderNumber: { type: String, default: null },
    note: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

stockMovementSchema.index({ product: 1, createdAt: -1 });
stockMovementSchema.index({ orderId: 1 });
stockMovementSchema.index({ type: 1, createdAt: -1 });

export const StockMovement = model<IStockMovement>('StockMovement', stockMovementSchema);
```

- [ ] **Step 3: Update `packages/types/src/product.ts`**

```typescript
export interface ProductImage {
  url: string;
  publicId: string;
  alt: string;
}

export interface ProductVariant {
  _id: string;
  label: string;
  price: number;
  sku: string;
  weight: number;
  isDefault: boolean;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  images: ProductImage[];
  category: string;
  variants: ProductVariant[];
  poolStock: number;
  reorderPoint: number;
  isActive: boolean;
  totalSold: number;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  name: string;
  slug?: string;
  description: string;
  images: ProductImage[];
  category: string;
  variants: Omit<ProductVariant, '_id'>[];
  poolStock?: number;
  reorderPoint?: number;
  isActive?: boolean;
}

export type UpdateProductInput = Partial<CreateProductInput>;
```

- [ ] **Step 4: Update `packages/types/src/stock.ts`**

```typescript
export type StockMovementType =
  | 'purchase'
  | 'sale'
  | 'return_resalable'
  | 'return_damaged'
  | 'adjustment';

export interface StockMovement {
  _id: string;
  type: StockMovementType;
  product: string;
  variant: string | null;
  qty: number;
  productName: string;
  variantLabel: string;
  unitCost: number | null;
  supplier: string | null;
  purchaseDate: string | null;
  reference: string | null;
  orderId: string | null;
  orderNumber: string | null;
  note: string;
  createdBy: string | null;
  createdAt: string;
}

export interface StockSummary {
  lowStockProducts: Array<{
    productId: string;
    productName: string;
    poolStock: number;
    reorderPoint: number;
  }>;
  todayMovementCount: number;
}

export interface AddStockInput {
  productId: string;
  qty: number;
  unitCost?: number;
  supplier?: string;
  purchaseDate?: string;
  reference?: string;
  note?: string;
}

export interface AdjustStockInput {
  productId: string;
  qty: number;
  note: string;
}

export interface ProcessReturnItem {
  variantId: string;
  resalableQty: number;
  damagedQty: number;
}

export interface ProcessReturnInput {
  items: ProcessReturnItem[];
  note?: string;
}
```

- [ ] **Step 5: Build shared types package to verify no compile errors**

```bash
cd /Users/afnanmahmud/Documents/kamiab-organic
pnpm --filter @kamiab/types build
```

Expected: build succeeds with no TypeScript errors.

---

## Task 3: Rewrite `stock.service.ts`

**Files:**
- Modify: `apps/api/src/services/stock.service.ts`

The key changes:
- `createMovement` for purchase/adjust: no `variantId`, just `productId` + `qty` (kg)
- `createSaleMovements`: group items by `productId`, deduct total kg per product in one atomic operation, create one StockMovement per original line item for audit trail

- [ ] **Step 1: Replace the full contents of `apps/api/src/services/stock.service.ts`**

```typescript
import mongoose from 'mongoose';
import { Product } from '../models/Product.js';
import { StockMovement, type IStockMovement } from '../models/StockMovement.js';

export class StockError extends Error {
  constructor(
    public code: 'INSUFFICIENT_STOCK' | 'PRODUCT_NOT_FOUND',
    message: string,
  ) {
    super(message);
    this.name = 'StockError';
  }
}

export interface CreateMovementInput {
  type: 'purchase' | 'adjustment';
  productId: string;
  qty: number;
  unitCost?: number;
  supplier?: string;
  purchaseDate?: Date;
  reference?: string;
  note?: string;
  createdBy?: string;
}

export async function createMovement(input: CreateMovementInput): Promise<IStockMovement> {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const product = await Product.findOne(
      { _id: new mongoose.Types.ObjectId(input.productId), deletedAt: null },
      { name: 1, poolStock: 1 },
    )
      .session(session)
      .lean();

    if (!product) {
      throw new StockError('PRODUCT_NOT_FOUND', 'Product not found');
    }

    const delta = input.type === 'adjustment' ? input.qty : Math.abs(input.qty);

    await Product.updateOne(
      { _id: new mongoose.Types.ObjectId(input.productId) },
      { $inc: { poolStock: delta } },
      { session },
    );

    const movements = await StockMovement.create(
      [
        {
          type: input.type,
          product: new mongoose.Types.ObjectId(input.productId),
          variant: null,
          qty: delta,
          productName: product.name,
          variantLabel: '',
          unitCost: input.unitCost ?? null,
          supplier: input.supplier ?? null,
          purchaseDate: input.purchaseDate ?? null,
          reference: input.reference ?? null,
          orderId: null,
          orderNumber: null,
          note: input.note ?? '',
          createdBy: input.createdBy ? new mongoose.Types.ObjectId(input.createdBy) : null,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    return movements[0] as IStockMovement;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }
}

export interface SaleMovementItem {
  productId: string;
  variantId: string;
  variantLabel: string;
  variantWeight: number;
  qty: number;
  productName: string;
  orderId: string;
  orderNumber: string;
}

export async function createSaleMovements(
  items: SaleMovementItem[],
  createdBy?: string,
): Promise<IStockMovement[]> {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Group by productId — deduct total kg per product in one atomic op
    const kgByProduct = new Map<string, number>();
    for (const item of items) {
      const current = kgByProduct.get(item.productId) ?? 0;
      kgByProduct.set(item.productId, current + item.variantWeight * item.qty);
    }

    for (const [productId, totalKg] of kgByProduct) {
      const updated = await Product.findOneAndUpdate(
        {
          _id: new mongoose.Types.ObjectId(productId),
          poolStock: { $gte: totalKg },
        },
        { $inc: { poolStock: -totalKg } },
        { new: true, session },
      );
      if (!updated) {
        const prod = await Product.findById(productId).session(session).lean();
        const name = prod?.name ?? productId;
        throw new StockError('INSUFFICIENT_STOCK', `স্টক শেষ — ${name}`);
      }
    }

    const docs = items.map((item) => ({
      type: 'sale' as const,
      product: new mongoose.Types.ObjectId(item.productId),
      variant: new mongoose.Types.ObjectId(item.variantId),
      qty: -(item.variantWeight * item.qty),
      productName: item.productName,
      variantLabel: item.variantLabel,
      orderId: new mongoose.Types.ObjectId(item.orderId),
      orderNumber: item.orderNumber,
      unitCost: null,
      supplier: null,
      purchaseDate: null,
      reference: null,
      note: '',
      createdBy: createdBy ? new mongoose.Types.ObjectId(createdBy) : null,
    }));

    const created = await StockMovement.insertMany(docs, { session });

    await session.commitTransaction();
    return created as IStockMovement[];
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    await session.endSession();
  }
}
```

- [ ] **Step 2: Build the API to check for TypeScript errors**

```bash
cd /Users/afnanmahmud/Documents/kamiab-organic/apps/api
pnpm tsc --noEmit
```

Expected: errors only in files we haven't updated yet (stock.routes.ts, orders.routes.ts). Zero errors in `services/stock.service.ts` and `models/`.

---

## Task 4: Update Admin Stock Routes

**Files:**
- Modify: `apps/api/src/routes/admin/stock.routes.ts`

- [ ] **Step 1: Replace full contents of `apps/api/src/routes/admin/stock.routes.ts`**

```typescript
import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { StockMovement } from '../../models/StockMovement.js';
import { Product } from '../../models/Product.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/api-response.js';
import { createMovement, StockError } from '../../services/stock.service.js';

const router: Router = Router();

// GET /api/admin/stock/summary
router.get('/summary', requirePermission('stock.view'), async (_req, res, next) => {
  try {
    const products = await Product.find({ deletedAt: null }).lean();

    const lowStockProducts = products
      .filter((p) => p.reorderPoint > 0 && p.poolStock <= p.reorderPoint)
      .map((p) => ({
        productId: String(p._id),
        productName: p.name,
        poolStock: p.poolStock,
        reorderPoint: p.reorderPoint,
      }));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMovementCount = await StockMovement.countDocuments({
      createdAt: { $gte: today },
    });

    sendSuccess(res, { lowStockProducts, todayMovementCount });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/stock/movements
const movementsQuerySchema = z.object({
  productId: z.string().optional(),
  type: z.enum(['purchase', 'sale', 'return_resalable', 'return_damaged', 'adjustment']).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get('/movements', requirePermission('stock.view'), async (req, res, next) => {
  try {
    const query = movementsQuerySchema.parse(req.query);
    const skip = (query.page - 1) * query.limit;

    const filter: Record<string, unknown> = {};
    if (query.productId) {
      filter['product'] = new mongoose.Types.ObjectId(query.productId);
    }
    if (query.type) filter['type'] = query.type;
    if (query.from || query.to) {
      const dateFilter: Record<string, Date> = {};
      if (query.from) {
        const fromDate = new Date(query.from);
        if (isNaN(fromDate.getTime())) {
          sendError(res, 'Invalid from date', 400, 'BAD_REQUEST');
          return;
        }
        dateFilter['$gte'] = fromDate;
      }
      if (query.to) {
        const toDate = new Date(query.to);
        if (isNaN(toDate.getTime())) {
          sendError(res, 'Invalid to date', 400, 'BAD_REQUEST');
          return;
        }
        toDate.setHours(23, 59, 59, 999);
        dateFilter['$lte'] = toDate;
      }
      filter['createdAt'] = dateFilter;
    }

    const [movements, total] = await Promise.all([
      StockMovement.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).lean(),
      StockMovement.countDocuments(filter),
    ]);

    sendPaginated(res, movements, { page: query.page, limit: query.limit, total });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/stock/movements — purchase receipt (product-level, qty in kg)
const addStockSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().min(0.001, 'Qty must be greater than 0'),
  unitCost: z.number().min(0).optional(),
  supplier: z.string().trim().optional(),
  purchaseDate: z
    .string()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
  reference: z.string().trim().optional(),
  note: z.string().default(''),
});

router.post('/movements', requirePermission('stock.edit'), async (req, res, next) => {
  try {
    const data = addStockSchema.parse(req.body);
    const movement = await createMovement({
      type: 'purchase',
      productId: data.productId,
      qty: data.qty,
      unitCost: data.unitCost,
      supplier: data.supplier,
      purchaseDate: data.purchaseDate,
      reference: data.reference,
      note: data.note,
      createdBy: req.user?._id ? String(req.user._id) : undefined,
    });
    sendSuccess(res, movement, 201);
  } catch (err) {
    if (err instanceof StockError && err.code === 'PRODUCT_NOT_FOUND') {
      sendError(res, err.message, 404, 'NOT_FOUND');
      return;
    }
    next(err);
  }
});

// POST /api/admin/stock/adjust — manual adjustment (product-level, qty in kg, can be negative)
const adjustStockSchema = z.object({
  productId: z.string().min(1),
  qty: z
    .number()
    .refine((n) => n !== 0, { message: 'Qty cannot be zero' }),
  note: z.string().min(1, 'Note is required for adjustments'),
});

router.post('/adjust', requirePermission('stock.edit'), async (req, res, next) => {
  try {
    const data = adjustStockSchema.parse(req.body);
    const movement = await createMovement({
      type: 'adjustment',
      productId: data.productId,
      qty: data.qty,
      note: data.note,
      createdBy: req.user?._id ? String(req.user._id) : undefined,
    });
    sendSuccess(res, movement, 201);
  } catch (err) {
    if (err instanceof StockError) {
      sendError(res, err.message, err.code === 'PRODUCT_NOT_FOUND' ? 404 : 409, err.code);
      return;
    }
    next(err);
  }
});

export default router;
```

---

## Task 5: Update Order Creation Routes (Stock Check + Deduction)

**Files:**
- Modify: `apps/api/src/routes/public/orders.routes.ts`
- Modify: `apps/api/src/routes/admin/orders.routes.ts`

The stock check now groups items by productId and checks `product.poolStock >= sum(weight × qty)`.

- [ ] **Step 1: Update public order route — pre-check section**

In `apps/api/src/routes/public/orders.routes.ts`, replace the pre-check block (the `for` loop after "Pre-check stock"):

Old:
```typescript
    // Pre-check stock — fast read before any writes
    for (const item of data.items) {
      const product = productMap.get(item.productId);
      const variant = product?.variants.find((v) => String(v._id) === item.variantId);
      if (variant && variant.stock < item.quantity) {
        sendError(
          res,
          `স্টক শেষ — ${variant.label} (${variant.stock} টি আছে)`,
          409,
          'INSUFFICIENT_STOCK',
        );
        return;
      }
    }
```

New:
```typescript
    // Pre-check stock — group by productId, check poolStock vs total kg needed
    const kgNeededByProduct = new Map<string, number>();
    for (const item of data.items) {
      const product = productMap.get(item.productId);
      const variant = product?.variants.find((v) => String(v._id) === item.variantId);
      if (variant) {
        const current = kgNeededByProduct.get(item.productId) ?? 0;
        kgNeededByProduct.set(item.productId, current + variant.weight * item.quantity);
      }
    }
    for (const [productId, totalKg] of kgNeededByProduct) {
      const product = productMap.get(productId);
      if (product && product.poolStock < totalKg) {
        sendError(
          res,
          `স্টক শেষ — ${product.name} (${product.poolStock} কেজি আছে)`,
          409,
          'INSUFFICIENT_STOCK',
        );
        return;
      }
    }
```

- [ ] **Step 2: Update public order route — `createSaleMovements` call**

Find the `createSaleMovements(...)` call in `apps/api/src/routes/public/orders.routes.ts` and update it to pass the new `SaleMovementItem` shape (add `variantWeight`):

Old:
```typescript
      await createSaleMovements(
        orderItems.map((item) => ({
          productId: String(item.product),
          variantId: String(item.variantId),
          qty: item.quantity,
          productName: item.productName,
          variantLabel: item.variantLabel,
          orderId: String(order._id),
          orderNumber: order.orderNumber,
        })),
      );
```

New:
```typescript
      await createSaleMovements(
        orderItems.map((item) => ({
          productId: String(item.product),
          variantId: String(item.variantId),
          variantLabel: item.variantLabel,
          variantWeight: item.weight,
          qty: item.quantity,
          productName: item.productName,
          orderId: String(order._id),
          orderNumber: order.orderNumber,
        })),
      );
```

- [ ] **Step 3: Update admin order route — pre-check section**

In `apps/api/src/routes/admin/orders.routes.ts`, find the manual order pre-check block:

Old:
```typescript
    for (const item of data.items) {
      const prod = stockProductMap.get(item.productId);
      const variant = prod?.variants.find((v) => String(v._id) === item.variantId);
      if (variant && variant.stock < item.quantity) {
        sendError(
          res,
          `স্টক শেষ — ${variant.label} (${variant.stock} টি আছে)`,
          409,
          'INSUFFICIENT_STOCK',
        );
        return;
      }
    }
```

New:
```typescript
    const kgNeededByProduct = new Map<string, number>();
    for (const item of data.items) {
      const prod = stockProductMap.get(item.productId);
      const variant = prod?.variants.find((v) => String(v._id) === item.variantId);
      if (variant) {
        const current = kgNeededByProduct.get(item.productId) ?? 0;
        kgNeededByProduct.set(item.productId, current + variant.weight * item.quantity);
      }
    }
    for (const [productId, totalKg] of kgNeededByProduct) {
      const prod = stockProductMap.get(productId);
      if (prod && prod.poolStock < totalKg) {
        sendError(
          res,
          `স্টক শেষ — ${prod.name} (${prod.poolStock} কেজি আছে)`,
          409,
          'INSUFFICIENT_STOCK',
        );
        return;
      }
    }
```

- [ ] **Step 4: Update admin order route — `createSaleMovements` call**

Find the `createSaleMovements` call in the manual order POST handler and update to new shape (same as Step 2 above — add `variantWeight: item.weight`):

```typescript
      await createSaleMovements(
        orderItems.map((item) => ({
          productId: String(item.product),
          variantId: String(item.variantId),
          variantLabel: item.variantLabel,
          variantWeight: item.weight,
          qty: item.quantity,
          productName: item.productName,
          orderId: String(order._id),
          orderNumber: order.orderNumber,
        })),
        req.user?._id ? String(req.user._id) : undefined,
      );
```

- [ ] **Step 5: Final backend TypeScript check**

```bash
cd /Users/afnanmahmud/Documents/kamiab-organic/apps/api
pnpm tsc --noEmit
```

Expected: zero errors.

---

## Task 6: Update Admin Stock Page — Frontend

**Files:**
- Modify: `apps/web/src/features/stock/add-stock-modal.tsx`
- Modify: `apps/web/src/features/stock/adjust-stock-modal.tsx`
- Modify: `apps/web/src/app/admin/stock/page.tsx`

### 6a: Rewrite `add-stock-modal.tsx`

No more variant picker. Just product + qty (kg) + optional fields.

- [ ] **Step 1: Replace full contents of `apps/web/src/features/stock/add-stock-modal.tsx`**

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { stockApi } from './stock.api';
import { productsApi } from '@/features/products/products.api';

const schema = z.object({
  productId: z.string().min(1, 'Select a product'),
  qty: z.coerce.number().min(0.001, 'Qty must be greater than 0'),
  unitCost: z.coerce.number().min(0).optional().or(z.literal('')).transform((v) => v === '' ? undefined : Number(v)),
  supplier: z.string().trim().optional(),
  purchaseDate: z.string().optional(),
  reference: z.string().trim().optional(),
  note: z.string().default(''),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  prefillProductId?: string;
}

export function AddStockModal({ open, onClose, prefillProductId }: Props) {
  const queryClient = useQueryClient();

  const { data: productsData } = useQuery({
    queryKey: ['admin-products-all'],
    queryFn: () => productsApi.list({ limit: 200 }),
    staleTime: 60_000,
  });

  const products = productsData?.data ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      productId: prefillProductId ?? '',
      qty: 0,
      note: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      stockApi.addStock({
        productId: values.productId,
        qty: values.qty,
        unitCost: values.unitCost as number | undefined,
        supplier: values.supplier,
        purchaseDate: values.purchaseDate,
        reference: values.reference,
        note: values.note,
      }),
    onSuccess: () => {
      toast.success('Stock added successfully');
      void queryClient.invalidateQueries({ queryKey: ['stock-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-products-all'] });
      form.reset();
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Stock (Purchase Receipt)</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="space-y-4 pt-2"
        >
          <div className="space-y-1.5">
            <Label>Product *</Label>
            <Select
              value={form.watch('productId')}
              onValueChange={(v) => form.setValue('productId', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name} — {p.poolStock} kg in stock
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.productId && (
              <p className="text-xs text-destructive">{form.formState.errors.productId.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Quantity (kg) *</Label>
              <Input type="number" min={0.001} step="0.1" {...form.register('qty')} />
              {form.formState.errors.qty && (
                <p className="text-xs text-destructive">{form.formState.errors.qty.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Unit Cost (optional)</Label>
              <Input type="number" min={0} step="0.01" placeholder="0.00" {...form.register('unitCost')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Supplier (optional)</Label>
            <Input placeholder="e.g. Rangpur Farm" {...form.register('supplier')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Purchase Date (optional)</Label>
              <Input type="date" {...form.register('purchaseDate')} />
            </div>
            <div className="space-y-1.5">
              <Label>Lot / Reference (optional)</Label>
              <Input placeholder="LOT-001" {...form.register('reference')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Note (optional)</Label>
            <Input placeholder="Additional info..." {...form.register('note')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Stock
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### 6b: Rewrite `adjust-stock-modal.tsx`

- [ ] **Step 2: Replace full contents of `apps/web/src/features/stock/adjust-stock-modal.tsx`**

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { stockApi } from './stock.api';
import { productsApi } from '@/features/products/products.api';

const schema = z.object({
  productId: z.string().min(1, 'Select a product'),
  qty: z.coerce
    .number()
    .refine((n) => n !== 0, { message: 'Qty cannot be zero' }),
  note: z.string().min(1, 'Note is required'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AdjustStockModal({ open, onClose }: Props) {
  const queryClient = useQueryClient();

  const { data: productsData } = useQuery({
    queryKey: ['admin-products-all'],
    queryFn: () => productsApi.list({ limit: 200 }),
    staleTime: 60_000,
  });

  const products = productsData?.data ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { productId: '', qty: 0, note: '' },
  });

  const watchedProductId = form.watch('productId');
  const currentProduct = products.find((p) => p._id === watchedProductId);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      stockApi.adjust({
        productId: values.productId,
        qty: values.qty,
        note: values.note,
      }),
    onSuccess: () => {
      toast.success('Stock adjusted successfully');
      void queryClient.invalidateQueries({ queryKey: ['stock-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-products-all'] });
      form.reset();
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="space-y-4 pt-2"
        >
          <div className="space-y-1.5">
            <Label>Product *</Label>
            <Select
              value={form.watch('productId')}
              onValueChange={(v) => form.setValue('productId', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.productId && (
              <p className="text-xs text-destructive">{form.formState.errors.productId.message}</p>
            )}
          </div>

          {currentProduct && (
            <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
              Current pool stock:{' '}
              <span className="font-bold">{currentProduct.poolStock} kg</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>
              Quantity Change (kg) *{' '}
              <span className="text-xs text-muted-foreground">(positive = add, negative = remove)</span>
            </Label>
            <Input
              type="number"
              step="0.1"
              placeholder="+5 or -3"
              {...form.register('qty')}
            />
            {form.formState.errors.qty && (
              <p className="text-xs text-destructive">{form.formState.errors.qty.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Reason / Note *</Label>
            <Textarea
              rows={2}
              placeholder="Reason for adjustment..."
              {...form.register('note')}
            />
            {form.formState.errors.note && (
              <p className="text-xs text-destructive">{form.formState.errors.note.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Adjustment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### 6c: Update stock page low-stock tab

- [ ] **Step 3: Update `apps/web/src/app/admin/stock/page.tsx`**

Change the `handleAddFromLowStock` function signature and call sites. Remove `prefillVariantId` everywhere. Also update the low-stock table to show product-level data.

Find and replace:
```typescript
  const [prefillVariantId, setPrefillVariantId] = useState<string | undefined>();
```
→ Remove this line entirely.

Find and replace:
```typescript
  const handleAddFromLowStock = (productId: string, variantId: string) => {
    setPrefillProductId(productId);
    setPrefillVariantId(variantId);
    setAddOpen(true);
  };
```
→:
```typescript
  const handleAddFromLowStock = (productId: string) => {
    setPrefillProductId(productId);
    setAddOpen(true);
  };
```

Find the low-stock table rows. Replace the old `summary.lowStockVariants.map(...)` with:
```tsx
                  {summary.lowStockProducts.map((p) => (
                    <TableRow key={p.productId}>
                      <TableCell className="font-medium">{p.productName}</TableCell>
                      <TableCell className="text-right">
                        <span className={cn('font-bold', p.poolStock === 0 ? 'text-destructive' : 'text-orange-600')}>
                          {p.poolStock} kg
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{p.reorderPoint} kg</TableCell>
                      <Can permission="stock.edit">
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleAddFromLowStock(p.productId)}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Add Stock
                          </Button>
                        </TableCell>
                      </Can>
                    </TableRow>
                  ))}
```

Update the table headers (remove "Variant" column, update "Current Stock" label):
```tsx
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Pool Stock</TableHead>
                    <TableHead className="text-right">Reorder Point</TableHead>
                    <Can permission="stock.edit">
                      <TableHead />
                    </Can>
                  </TableRow>
```

Update the low-stock count badge reference from `lowStockVariants` to `lowStockProducts`:
```typescript
// All occurrences of summary.lowStockVariants → summary.lowStockProducts
```

Update AddStockModal call at the bottom of the page — remove `prefillVariantId` prop:
```tsx
      <AddStockModal
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setPrefillProductId(undefined);
        }}
        prefillProductId={prefillProductId}
      />
```

- [ ] **Step 4: Update `stock.api.ts` to remove `variantId` from inputs**

In `apps/web/src/features/stock/stock.api.ts`, the `AddStockInput` and `AdjustStockInput` types now come from `@kamiab/types` so no change is needed there — but verify the `StockMovementFilters` type — remove `variantId` if present:

```typescript
export interface StockMovementFilters
  extends Record<string, string | number | boolean | undefined> {
  productId?: string;
  type?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}
```

---

## Task 7: Update Product Form (Remove Variant Stock Fields)

**Files:**
- Modify: `apps/web/src/features/products/product-form.tsx`

The product form currently has `stock` and `reorderPoint` in each variant row. These move to product-level fields.

- [ ] **Step 1: Update the Zod schema in `product-form.tsx`**

Find `variantSchema` and remove `stock` and `reorderPoint`:
```typescript
const variantSchema = z.object({
  _id: z.string().optional(),
  label: z.string().min(1, 'Label required'),
  price: z.coerce.number().min(0, 'Price must be ≥ 0'),
  sku: z.string().default(''),
  weight: z.coerce.number().min(0, 'Weight must be ≥ 0'),
  isDefault: z.boolean(),
});
```

Find `productFormSchema` and add `poolStock` and `reorderPoint`:
```typescript
const productFormSchema = z.object({
  name: z.string().min(1, 'Name required'),
  slug: z.string().min(1, 'Slug required').regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
  description: z.string().default(''),
  category: z.string().min(1, 'Category required'),
  images: z.array(
    z.object({ url: z.string(), publicId: z.string(), alt: z.string() }),
  ),
  variants: z
    .array(variantSchema)
    .min(1, 'At least one variant required')
    .refine((vs) => vs.filter((v) => v.isDefault).length === 1, {
      message: 'Exactly one variant must be marked as default',
    }),
  poolStock: z.coerce.number().min(0).default(0),
  reorderPoint: z.coerce.number().min(0).default(0),
  isActive: z.boolean(),
});
```

- [ ] **Step 2: Update `defaultVariant()` helper**

```typescript
function defaultVariant() {
  return { label: '', price: 0, sku: '', weight: 0, isDefault: false };
}
```

- [ ] **Step 3: Remove `stock` and `reorderPoint` inputs from the variant row JSX**

Find the variant row JSX in the form. Remove the two `<div>` blocks that contain the `stock` and `reorderPoint` inputs. These are typically in a grid layout inside the variant repeater.

- [ ] **Step 4: Add product-level `poolStock` and `reorderPoint` inputs**

After the variants section (after the closing of the variants fieldArray block), add:

```tsx
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Pool Stock (kg)</Label>
              <Input
                type="number"
                min={0}
                step="0.1"
                {...form.register('poolStock')}
              />
              <p className="text-xs text-muted-foreground">Total kg available across all variants</p>
              {form.formState.errors.poolStock && (
                <p className="text-xs text-destructive">{form.formState.errors.poolStock.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Reorder Point (kg)</Label>
              <Input
                type="number"
                min={0}
                step="0.1"
                {...form.register('reorderPoint')}
              />
              <p className="text-xs text-muted-foreground">Alert when stock falls below this</p>
              {form.formState.errors.reorderPoint && (
                <p className="text-xs text-destructive">{form.formState.errors.reorderPoint.message}</p>
              )}
            </div>
          </div>
```

- [ ] **Step 5: Update `useEffect` that seeds form values from existing product**

Find the `useEffect` that calls `form.reset(...)` with the existing product's values. Update it to include `poolStock` and `reorderPoint`, and update the variants mapping to exclude `stock`/`reorderPoint`:

```typescript
  useEffect(() => {
    if (!product) return;
    form.reset({
      name: product.name,
      slug: product.slug,
      description: product.description,
      category: product.category,
      images: product.images,
      variants: product.variants.map((v) => ({
        _id: v._id,
        label: v.label,
        price: v.price,
        sku: v.sku,
        weight: v.weight,
        isDefault: v.isDefault,
      })),
      poolStock: product.poolStock ?? 0,
      reorderPoint: product.reorderPoint ?? 0,
      isActive: product.isActive,
    });
  }, [product, form]);
```

---

## Task 8: Update Public Product Page Availability Check

**Files:**
- Modify: `apps/web/src/app/products/[slug]/page.tsx`

- [ ] **Step 1: Update `inStock` calculation**

Find line 104:
```typescript
  const inStock = (selectedVariant?.stock ?? 0) > 0;
```

Replace with:
```typescript
  const inStock =
    selectedVariant !== undefined &&
    (product?.poolStock ?? 0) >= selectedVariant.weight * qty;
```

- [ ] **Step 2: Ensure qty is used in inStock check**

The `inStock` expression now depends on `qty` state, which is already defined. No other changes needed in this file.

---

## Task 9: Frontend TypeScript Build Check + Final Verification

- [ ] **Step 1: Build the web app**

```bash
cd /Users/afnanmahmud/Documents/kamiab-organic/apps/web
pnpm tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 2: Build the API**

```bash
cd /Users/afnanmahmud/Documents/kamiab-organic/apps/api
pnpm tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Start the API and verify the stock summary endpoint**

```bash
cd /Users/afnanmahmud/Documents/kamiab-organic/apps/api
pnpm dev &
curl -s http://localhost:4000/api/admin/stock/summary -H "Authorization: Bearer <token>" | jq .
```

Expected: response with `lowStockProducts` array (not `lowStockVariants`).

- [ ] **Step 4: Test adding stock via API**

```bash
curl -s -X POST http://localhost:4000/api/admin/stock/movements \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"productId":"<id>","qty":50}' | jq .
```

Expected: 201 response with StockMovement record, `variant: null`, `qty: 50`.

- [ ] **Step 5: Verify product poolStock updated**

```bash
curl -s http://localhost:4000/api/admin/products/<id> -H "Authorization: Bearer <token>" | jq '.data.poolStock'
```

Expected: increased by 50.

- [ ] **Step 6: Commit**

```bash
cd /Users/afnanmahmud/Documents/kamiab-organic
git add apps/api/src/models/Product.ts \
        apps/api/src/models/StockMovement.ts \
        apps/api/src/services/stock.service.ts \
        apps/api/src/routes/admin/stock.routes.ts \
        apps/api/src/routes/public/orders.routes.ts \
        apps/api/src/routes/admin/orders.routes.ts \
        apps/api/src/scripts/migrate-pool-stock.ts \
        packages/types/src/product.ts \
        packages/types/src/stock.ts \
        apps/web/src/features/stock/add-stock-modal.tsx \
        apps/web/src/features/stock/adjust-stock-modal.tsx \
        apps/web/src/app/admin/stock/page.tsx \
        apps/web/src/features/products/product-form.tsx \
        apps/web/src/app/products/[slug]/page.tsx
git commit -m "feat: replace per-variant stock with product-level kg pool"
```

---

## Deployment Checklist

Run these steps IN ORDER when deploying to production:

1. Deploy the new API code (do NOT restart yet)
2. Run migration: `MONGODB_URI="<prod-uri>" pnpm migrate:pool-stock`
3. Verify migration output — check a few products manually in Atlas
4. Restart API: `pm2 restart api`
5. Deploy frontend
6. Smoke test: open a product page, verify it shows stock status correctly; place a test order; check admin stock page shows kg values

---

## Edge Cases & Notes

- **Weight = 0 variants:** If any variant has `weight: 0`, that variant will never deduct from poolStock (0 × qty = 0 kg). This is likely a data entry mistake — the migration will also not contribute those variants' stock to poolStock. Check for such variants before running migration: `db.products.find({ "variants.weight": 0 }, { name: 1, variants: 1 })`
- **Existing StockMovement records:** Old records have `qty` in "units" not kg. The movement log will show a mix of semantics for historical records. This is acceptable — the audit trail is preserved. New records from this point forward are in kg.
- **process-return-modal:** If `apps/web/src/features/stock/process-return-modal.tsx` exists and uses variantId for stock returns, it will need similar updates. Inspect and adapt to use product-level poolStock if needed (returns add kg back to poolStock).
