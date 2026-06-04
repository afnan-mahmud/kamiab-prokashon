# Stock Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full inventory ledger to the admin panel — purchase receipts add stock, orders decrement it atomically, courier returns split into resalable vs damaged, with a `/admin/stock` UI and low-stock alerts per variant.

**Architecture:** Every stock change writes an immutable `StockMovement` document while atomically updating `variant.stock` via a MongoDB conditional `findOneAndUpdate`. A single `stock.service.ts` is the only place that touches `variant.stock`. Orders are hard-blocked when stock is insufficient.

**Tech Stack:** Mongoose 8, MongoDB transactions (Atlas replica set), Zod, Next.js 14 App Router, TanStack Query, React Hook Form, shadcn/ui.

---

## File Map

**New files:**
- `packages/types/src/stock.ts`
- `apps/api/src/models/StockMovement.ts`
- `apps/api/src/services/stock.service.ts`
- `apps/api/src/routes/admin/stock.routes.ts`
- `apps/web/src/features/stock/stock.api.ts`
- `apps/web/src/app/admin/stock/page.tsx`
- `apps/web/src/features/stock/add-stock-modal.tsx`
- `apps/web/src/features/stock/adjust-stock-modal.tsx`
- `apps/web/src/features/stock/process-return-modal.tsx`

**Modified files:**
- `packages/types/src/auth.ts` — add `stock.view | stock.edit`
- `packages/types/src/order.ts` — add `'Returned'` to `OrderStatus`
- `packages/types/src/product.ts` — add `reorderPoint` to `ProductVariant`
- `packages/types/src/index.ts` — export stock types
- `apps/api/src/models/Product.ts` — add `reorderPoint` to variant schema + interface
- `apps/api/src/models/Order.ts` — add `'Returned'` to status enum
- `apps/api/src/models/index.ts` — export `StockMovement`
- `apps/api/src/scripts/seed.ts` — add stock permissions to ALL_PERMISSIONS
- `apps/api/src/routes/admin/index.ts` — mount `/stock` router
- `apps/api/src/routes/admin/products.routes.ts` — add `reorderPoint` to Zod variantSchema
- `apps/api/src/routes/public/orders.routes.ts` — stock pre-check + sale movements after order creation
- `apps/api/src/routes/admin/orders.routes.ts` — same hooks + `POST /:id/return` endpoint
- `apps/web/src/components/layout/admin-sidebar.tsx` — add Stock nav item
- `apps/web/src/features/products/product-form.tsx` — add `reorderPoint` field per variant
- `apps/web/src/features/orders/orders.api.ts` — add `processReturn` method
- `apps/web/src/app/admin/orders/[id]/page.tsx` — Process Return button + modal

---

## Task 1: Shared types

**Files:**
- Modify: `packages/types/src/auth.ts`
- Modify: `packages/types/src/order.ts`
- Modify: `packages/types/src/product.ts`
- Create: `packages/types/src/stock.ts`
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Add `stock.view` and `stock.edit` to Permission union**

In `packages/types/src/auth.ts`, add two entries to the `Permission` type union (after `settings.edit`):

```ts
  | 'stock.view'
  | 'stock.edit';
```

- [ ] **Step 2: Add `'Returned'` to OrderStatus**

In `packages/types/src/order.ts`, change:

```ts
export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Cancelled'
  | 'Call not received'
  | 'Fake order'
  | 'Hand over to Courier'
  | 'Returned';
```

- [ ] **Step 3: Add `reorderPoint` to ProductVariant**

In `packages/types/src/product.ts`, add `reorderPoint` to the `ProductVariant` interface:

```ts
export interface ProductVariant {
  _id: string;
  label: string;
  price: number;
  stock: number;
  sku: string;
  weight: number;
  isDefault: boolean;
  reorderPoint: number;
}
```

- [ ] **Step 4: Create `packages/types/src/stock.ts`**

```ts
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
  variant: string;
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
  lowStockVariants: Array<{
    productId: string;
    productName: string;
    variantId: string;
    variantLabel: string;
    stock: number;
    reorderPoint: number;
  }>;
  todayMovementCount: number;
}

export interface AddStockInput {
  productId: string;
  variantId: string;
  qty: number;
  unitCost?: number;
  supplier?: string;
  purchaseDate?: string;
  reference?: string;
  note?: string;
}

export interface AdjustStockInput {
  productId: string;
  variantId: string;
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

- [ ] **Step 5: Export stock types from index**

In `packages/types/src/index.ts`, add:

```ts
export * from './stock.js';
```

- [ ] **Step 6: Build types package**

```bash
pnpm --filter @shukhilife/types build
```

Expected: no errors, `dist/` files regenerated.

- [ ] **Step 7: Commit**

```bash
git add packages/types/src/
git commit -m "feat(types): add stock types, Returned status, reorderPoint, stock permissions"
```

---

## Task 2: StockMovement model + Product/Order model updates

**Files:**
- Create: `apps/api/src/models/StockMovement.ts`
- Modify: `apps/api/src/models/Product.ts`
- Modify: `apps/api/src/models/Order.ts`
- Modify: `apps/api/src/models/index.ts`

- [ ] **Step 1: Create `apps/api/src/models/StockMovement.ts`**

```ts
import { Schema, model, type Document, type Types } from 'mongoose';
import type { StockMovementType } from '@shukhilife/types';

export interface IStockMovement extends Document {
  type: StockMovementType;
  product: Types.ObjectId;
  variant: Types.ObjectId;
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
    variant: { type: Schema.Types.ObjectId, required: true },
    qty: { type: Number, required: true },
    productName: { type: String, required: true },
    variantLabel: { type: String, required: true },
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

stockMovementSchema.index({ product: 1, variant: 1, createdAt: -1 });
stockMovementSchema.index({ orderId: 1 });
stockMovementSchema.index({ type: 1, createdAt: -1 });

export const StockMovement = model<IStockMovement>('StockMovement', stockMovementSchema);
```

- [ ] **Step 2: Add `reorderPoint` to Product variant schema and interface**

In `apps/api/src/models/Product.ts`, update `IProductVariant`:

```ts
export interface IProductVariant {
  label: string;
  price: number;
  stock: number;
  sku: string;
  weight: number;
  isDefault: boolean;
  reorderPoint: number;
}
```

And in `variantSchema`, add the field after `isDefault`:

```ts
    reorderPoint: { type: Number, min: 0, default: 0 },
```

- [ ] **Step 3: Add `'Returned'` to Order status enum**

In `apps/api/src/models/Order.ts`, update the `status` field enum array:

```ts
    status: {
      type: String,
      enum: [
        'Pending',
        'Confirmed',
        'Cancelled',
        'Call not received',
        'Fake order',
        'Hand over to Courier',
        'Returned',
      ],
      default: 'Pending',
    },
```

- [ ] **Step 4: Export from `apps/api/src/models/index.ts`**

Add these two lines:

```ts
export { StockMovement } from './StockMovement.js';
export type { IStockMovement } from './StockMovement.js';
```

- [ ] **Step 5: Type-check**

```bash
pnpm --filter @shukhilife/api type-check
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/models/
git commit -m "feat(api): add StockMovement model, reorderPoint to variants, Returned order status"
```

---

## Task 3: stock.service.ts

**Files:**
- Create: `apps/api/src/services/stock.service.ts`

- [ ] **Step 1: Create `apps/api/src/services/stock.service.ts`**

```ts
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
  type: 'purchase' | 'sale' | 'return_resalable' | 'return_damaged' | 'adjustment';
  productId: string;
  variantId: string;
  qty: number;
  orderId?: string;
  orderNumber?: string;
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
      { 'variants._id': new mongoose.Types.ObjectId(input.variantId), deletedAt: null },
      { name: 1, 'variants.$': 1 },
    )
      .session(session)
      .lean();

    if (!product || !product.variants[0]) {
      throw new StockError('PRODUCT_NOT_FOUND', 'Product or variant not found');
    }

    const variant = product.variants[0];

    if (input.type === 'sale') {
      const updated = await Product.findOneAndUpdate(
        {
          'variants._id': new mongoose.Types.ObjectId(input.variantId),
          'variants.stock': { $gte: Math.abs(input.qty) },
        },
        { $inc: { 'variants.$.stock': -Math.abs(input.qty) } },
        { new: true, session },
      );
      if (!updated) {
        throw new StockError('INSUFFICIENT_STOCK', `স্টক শেষ — ${variant.label}`);
      }
    } else if (input.type !== 'return_damaged') {
      const delta =
        input.type === 'adjustment' ? input.qty : Math.abs(input.qty);
      await Product.updateOne(
        { 'variants._id': new mongoose.Types.ObjectId(input.variantId) },
        { $inc: { 'variants.$.stock': delta } },
        { session },
      );
    }
    // return_damaged: no stock delta — only the audit record

    const storedQty =
      input.type === 'sale'
        ? -Math.abs(input.qty)
        : input.type === 'adjustment'
        ? input.qty
        : Math.abs(input.qty);

    const [movement] = await StockMovement.create(
      [
        {
          type: input.type,
          product: new mongoose.Types.ObjectId(input.productId),
          variant: new mongoose.Types.ObjectId(input.variantId),
          qty: storedQty,
          productName: product.name,
          variantLabel: variant.label,
          unitCost: input.unitCost ?? null,
          supplier: input.supplier ?? null,
          purchaseDate: input.purchaseDate ?? null,
          reference: input.reference ?? null,
          orderId: input.orderId ? new mongoose.Types.ObjectId(input.orderId) : null,
          orderNumber: input.orderNumber ?? null,
          note: input.note ?? '',
          createdBy: input.createdBy ? new mongoose.Types.ObjectId(input.createdBy) : null,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    return movement;
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
  qty: number;
  productName: string;
  variantLabel: string;
  orderId: string;
  orderNumber: string;
}

// Batch all order line-items in one transaction — all succeed or all roll back
export async function createSaleMovements(
  items: SaleMovementItem[],
  createdBy?: string,
): Promise<IStockMovement[]> {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    for (const item of items) {
      const updated = await Product.findOneAndUpdate(
        {
          'variants._id': new mongoose.Types.ObjectId(item.variantId),
          'variants.stock': { $gte: item.qty },
        },
        { $inc: { 'variants.$.stock': -item.qty } },
        { new: true, session },
      );
      if (!updated) {
        throw new StockError('INSUFFICIENT_STOCK', `স্টক শেষ — ${item.variantLabel}`);
      }
    }

    const docs = items.map((item) => ({
      type: 'sale' as const,
      product: new mongoose.Types.ObjectId(item.productId),
      variant: new mongoose.Types.ObjectId(item.variantId),
      qty: -item.qty,
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

- [ ] **Step 2: Type-check**

```bash
pnpm --filter @shukhilife/api type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/services/stock.service.ts
git commit -m "feat(api): add stock.service with createMovement and createSaleMovements"
```

---

## Task 4: Seed script + stock admin routes + admin index

**Files:**
- Modify: `apps/api/src/scripts/seed.ts`
- Create: `apps/api/src/routes/admin/stock.routes.ts`
- Modify: `apps/api/src/routes/admin/index.ts`

- [ ] **Step 1: Add stock permissions to seed**

In `apps/api/src/scripts/seed.ts`, add to `ALL_PERMISSIONS` array (after `'settings.edit'`):

```ts
  'stock.view', 'stock.edit',
```

Also add `'stock.view'` to `managerPermissions`:

```ts
  'stock.view',
```

- [ ] **Step 2: Create `apps/api/src/routes/admin/stock.routes.ts`**

```ts
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
    const lowStockVariants = [];
    for (const product of products) {
      for (const variant of product.variants) {
        if (variant.reorderPoint > 0 && variant.stock <= variant.reorderPoint) {
          lowStockVariants.push({
            productId: String(product._id),
            productName: product.name,
            variantId: String(variant._id),
            variantLabel: variant.label,
            stock: variant.stock,
            reorderPoint: variant.reorderPoint,
          });
        }
      }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMovementCount = await StockMovement.countDocuments({
      createdAt: { $gte: today },
    });

    sendSuccess(res, { lowStockVariants, todayMovementCount });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/stock/movements
router.get('/movements', requirePermission('stock.view'), async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query['page'] ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query['limit'] ?? 20)));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (req.query['productId']) {
      filter['product'] = new mongoose.Types.ObjectId(String(req.query['productId']));
    }
    if (req.query['variantId']) {
      filter['variant'] = new mongoose.Types.ObjectId(String(req.query['variantId']));
    }
    if (req.query['type']) filter['type'] = req.query['type'];
    if (req.query['from'] || req.query['to']) {
      const dateFilter: Record<string, Date> = {};
      if (req.query['from']) dateFilter['$gte'] = new Date(String(req.query['from']));
      if (req.query['to']) {
        const to = new Date(String(req.query['to']));
        to.setHours(23, 59, 59, 999);
        dateFilter['$lte'] = to;
      }
      filter['createdAt'] = dateFilter;
    }

    const [movements, total] = await Promise.all([
      StockMovement.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      StockMovement.countDocuments(filter),
    ]);

    sendPaginated(res, movements, { page, limit, total });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/stock/movements — purchase receipt
const addStockSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  qty: z.number().int().min(1, 'Qty must be at least 1'),
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
      variantId: data.variantId,
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

// POST /api/admin/stock/adjust — manual adjustment
const adjustStockSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  qty: z
    .number()
    .int()
    .refine((n) => n !== 0, { message: 'Qty cannot be zero' }),
  note: z.string().min(1, 'Note is required for adjustments'),
});

router.post('/adjust', requirePermission('stock.edit'), async (req, res, next) => {
  try {
    const data = adjustStockSchema.parse(req.body);
    const movement = await createMovement({
      type: 'adjustment',
      productId: data.productId,
      variantId: data.variantId,
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

- [ ] **Step 3: Mount stock router in `apps/api/src/routes/admin/index.ts`**

Add the import and `router.use` call (add after `smsSettingsRouter`):

```ts
import stockRouter from './stock.routes.js';
```

```ts
router.use('/stock', stockRouter);
```

- [ ] **Step 4: Type-check**

```bash
pnpm --filter @shukhilife/api type-check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/scripts/seed.ts apps/api/src/routes/admin/stock.routes.ts apps/api/src/routes/admin/index.ts
git commit -m "feat(api): add stock admin routes (movements, adjust, summary)"
```

---

## Task 5: Products routes reorderPoint + order creation stock hooks + return endpoint

**Files:**
- Modify: `apps/api/src/routes/admin/products.routes.ts`
- Modify: `apps/api/src/routes/public/orders.routes.ts`
- Modify: `apps/api/src/routes/admin/orders.routes.ts`

- [ ] **Step 1: Add `reorderPoint` to variantSchema in products routes**

In `apps/api/src/routes/admin/products.routes.ts`, update `variantSchema`:

```ts
const variantSchema = z.object({
  _id: z.string().optional(),
  label: z.string().min(1).trim(),
  price: z.number().min(0),
  stock: z.number().int().min(0),
  sku: z.string().trim().default(''),
  weight: z.number().min(0),
  isDefault: z.boolean(),
  reorderPoint: z.number().int().min(0).default(0),
});
```

- [ ] **Step 2: Add stock import to public orders route**

In `apps/api/src/routes/public/orders.routes.ts`, add these imports after existing imports:

```ts
import { createSaleMovements, StockError } from '../../services/stock.service.js';
```

- [ ] **Step 3: Add stock pre-check to public order creation**

In `apps/api/src/routes/public/orders.routes.ts`, add a pre-check loop after the `orderItems` array is built and before the delivery charge calculation (after the closing brace of the `for (const item of data.items)` loop):

```ts
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

- [ ] **Step 4: Add sale movements after order creation in public route**

In `apps/api/src/routes/public/orders.routes.ts`, after `const order = await Order.create({...});` and before `sendSuccess(...)`, add:

```ts
    // Decrement stock — atomic batch; if race-condition causes failure, delete the order
    try {
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
    } catch (stockErr) {
      await Order.deleteOne({ _id: order._id });
      if (stockErr instanceof StockError && stockErr.code === 'INSUFFICIENT_STOCK') {
        sendError(res, (stockErr as StockError).message, 409, 'INSUFFICIENT_STOCK');
        return;
      }
      throw stockErr;
    }
```

- [ ] **Step 5: Add stock import to admin orders route**

In `apps/api/src/routes/admin/orders.routes.ts`, add after existing imports:

```ts
import { createSaleMovements, createMovement, StockError } from '../../services/stock.service.js';
```

- [ ] **Step 6: Add stock pre-check + sale movements to admin order creation (POST handler)**

In `apps/api/src/routes/admin/orders.routes.ts`, inside the `router.post('/', ...)` handler, add the pre-check after `const orderItems = await buildOrderItems(data.items);`:

```ts
    // Pre-check stock
    const productIds2 = [...new Set(data.items.map((i) => i.productId))];
    const productsForStockCheck = await Product.find({
      _id: { $in: productIds2 },
      deletedAt: null,
    }).lean();
    const productMapForStock = new Map(productsForStockCheck.map((p) => [String(p._id), p]));

    for (const item of data.items) {
      const prod = productMapForStock.get(item.productId);
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

Then after `const order = await Order.create({...});` and before `sendSuccess(...)`:

```ts
    try {
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
        req.user?._id ? String(req.user._id) : undefined,
      );
    } catch (stockErr) {
      await Order.deleteOne({ _id: order._id });
      if (stockErr instanceof StockError && stockErr.code === 'INSUFFICIENT_STOCK') {
        sendError(res, (stockErr as StockError).message, 409, 'INSUFFICIENT_STOCK');
        return;
      }
      throw stockErr;
    }
```

- [ ] **Step 7: Add `POST /:id/return` endpoint to admin orders route**

At the end of `apps/api/src/routes/admin/orders.routes.ts` (before `export default router`), add:

```ts
// POST /api/admin/orders/:id/return — process courier return
const processReturnSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().min(1),
        resalableQty: z.number().int().min(0),
        damagedQty: z.number().int().min(0),
      }),
    )
    .min(1),
  note: z.string().default(''),
});

router.post('/:id/return', requirePermission('orders.edit'), async (req, res, next) => {
  try {
    const order = await Order.findById(req.params['id']);
    if (!order) {
      sendError(res, 'Order not found', 404, 'NOT_FOUND');
      return;
    }
    if (order.status === 'Returned') {
      sendError(res, 'Order already processed as returned', 409, 'CONFLICT');
      return;
    }

    const data = processReturnSchema.parse(req.body);

    for (const returnItem of data.items) {
      const orderItem = order.items.find((i) => String(i.variantId) === returnItem.variantId);
      if (!orderItem) {
        sendError(res, `Variant ${returnItem.variantId} not in this order`, 400, 'BAD_REQUEST');
        return;
      }
      if (returnItem.resalableQty + returnItem.damagedQty > orderItem.quantity) {
        sendError(
          res,
          `Return qty exceeds ordered qty for ${orderItem.variantLabel}`,
          400,
          'BAD_REQUEST',
        );
        return;
      }
    }

    for (const returnItem of data.items) {
      const orderItem = order.items.find((i) => String(i.variantId) === returnItem.variantId)!;
      const base = {
        productId: String(orderItem.product),
        variantId: returnItem.variantId,
        orderId: String(order._id),
        orderNumber: order.orderNumber,
        note: data.note,
        createdBy: req.user?._id ? String(req.user._id) : undefined,
      };
      if (returnItem.resalableQty > 0) {
        await createMovement({ ...base, type: 'return_resalable', qty: returnItem.resalableQty });
      }
      if (returnItem.damagedQty > 0) {
        await createMovement({ ...base, type: 'return_damaged', qty: returnItem.damagedQty });
      }
    }

    order.status = 'Returned' as import('@shukhilife/types').OrderStatus;
    order.statusHistory.push({
      status: 'Returned' as import('@shukhilife/types').OrderStatus,
      changedBy: req.user?._id ? new mongoose.Types.ObjectId(req.user._id) : null,
      changedAt: new Date(),
      note: data.note || 'Courier return processed',
    });
    await order.save();

    sendSuccess(res, order);
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 8: Type-check**

```bash
pnpm --filter @shukhilife/api type-check
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/routes/
git commit -m "feat(api): hook stock decrement into order creation + add return processing endpoint"
```

---

## Task 6: Frontend stock API client + orders API processReturn

**Files:**
- Create: `apps/web/src/features/stock/stock.api.ts`
- Modify: `apps/web/src/features/orders/orders.api.ts`

- [ ] **Step 1: Create `apps/web/src/features/stock/stock.api.ts`**

```ts
import { apiClient } from '@/lib/api-client';
import type {
  StockMovement,
  StockSummary,
  AddStockInput,
  AdjustStockInput,
  PaginatedResponse,
} from '@shukhilife/types';

export interface StockMovementFilters
  extends Record<string, string | number | boolean | undefined> {
  productId?: string;
  variantId?: string;
  type?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export const stockApi = {
  summary: () => apiClient.get<StockSummary>('/admin/stock/summary'),

  movements: (filters: StockMovementFilters = {}) =>
    apiClient.get<PaginatedResponse<StockMovement>>('/admin/stock/movements', {
      params: filters,
    }),

  addStock: (data: AddStockInput) =>
    apiClient.post<StockMovement>('/admin/stock/movements', data),

  adjust: (data: AdjustStockInput) =>
    apiClient.post<StockMovement>('/admin/stock/adjust', data),
};
```

- [ ] **Step 2: Add `processReturn` to `apps/web/src/features/orders/orders.api.ts`**

Add `ProcessReturnInput` to the import from `@shukhilife/types`:

```ts
import type { Order, PaginatedResponse, ProcessReturnInput } from '@shukhilife/types';
```

Add at the end of the `ordersApi` object:

```ts
  processReturn: (id: string, data: ProcessReturnInput) =>
    apiClient.post<Order>(`/admin/orders/${id}/return`, data),
```

- [ ] **Step 3: Type-check**

```bash
pnpm --filter @shukhilife/web type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/stock/stock.api.ts apps/web/src/features/orders/orders.api.ts
git commit -m "feat(web): add stock API client and processReturn to orders API"
```

---

## Task 7: `/admin/stock` page + Add Stock modal + Adjust Stock modal

**Files:**
- Create: `apps/web/src/app/admin/stock/page.tsx`
- Create: `apps/web/src/features/stock/add-stock-modal.tsx`
- Create: `apps/web/src/features/stock/adjust-stock-modal.tsx`

- [ ] **Step 1: Create `apps/web/src/features/stock/add-stock-modal.tsx`**

```tsx
'use client';

import { useState } from 'react';
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
  variantId: z.string().min(1, 'Select a variant'),
  qty: z.coerce.number().int().min(1, 'Qty must be at least 1'),
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
  prefillVariantId?: string;
}

export function AddStockModal({ open, onClose, prefillProductId, prefillVariantId }: Props) {
  const queryClient = useQueryClient();
  const [selectedProductId, setSelectedProductId] = useState(prefillProductId ?? '');

  const { data: productsData } = useQuery({
    queryKey: ['admin-products-all'],
    queryFn: () => productsApi.list({ limit: 200, isActive: undefined }),
    staleTime: 60_000,
  });

  const products = productsData?.data ?? [];
  const selectedProduct = products.find((p) => p._id === selectedProductId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      productId: prefillProductId ?? '',
      variantId: prefillVariantId ?? '',
      qty: 1,
      note: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      stockApi.addStock({
        productId: values.productId,
        variantId: values.variantId,
        qty: values.qty,
        unitCost: values.unitCost as number | undefined,
        supplier: values.supplier,
        purchaseDate: values.purchaseDate,
        reference: values.reference,
        note: values.note,
      }),
    onSuccess: () => {
      toast.success('স্টক যোগ হয়েছে');
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
          <DialogTitle>স্টক যোগ করুন (Purchase Receipt)</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="space-y-4 pt-2"
        >
          <div className="space-y-1.5">
            <Label>পণ্য *</Label>
            <Select
              value={form.watch('productId')}
              onValueChange={(v) => {
                setSelectedProductId(v);
                form.setValue('productId', v);
                form.setValue('variantId', '');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="পণ্য বেছে নিন" />
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

          {selectedProduct && (
            <div className="space-y-1.5">
              <Label>ভ্যারিয়েন্ট *</Label>
              <Select
                value={form.watch('variantId')}
                onValueChange={(v) => form.setValue('variantId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="ভ্যারিয়েন্ট বেছে নিন" />
                </SelectTrigger>
                <SelectContent>
                  {selectedProduct.variants.map((v) => (
                    <SelectItem key={v._id} value={v._id}>
                      {v.label} — স্টক: {v.stock}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.variantId && (
                <p className="text-xs text-destructive">{form.formState.errors.variantId.message}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>পরিমাণ (Qty) *</Label>
              <Input type="number" min={1} {...form.register('qty')} />
              {form.formState.errors.qty && (
                <p className="text-xs text-destructive">{form.formState.errors.qty.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>ক্রয় মূল্য (ঐচ্ছিক)</Label>
              <Input type="number" min={0} step="0.01" placeholder="0.00" {...form.register('unitCost')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>সরবরাহকারী (ঐচ্ছিক)</Label>
            <Input placeholder="যেমন: রংপুর ফার্ম" {...form.register('supplier')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>ক্রয়ের তারিখ (ঐচ্ছিক)</Label>
              <Input type="date" {...form.register('purchaseDate')} />
            </div>
            <div className="space-y-1.5">
              <Label>লট / রেফারেন্স (ঐচ্ছিক)</Label>
              <Input placeholder="LOT-001" {...form.register('reference')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>নোট (ঐচ্ছিক)</Label>
            <Input placeholder="অতিরিক্ত তথ্য..." {...form.register('note')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>বাতিল</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              স্টক যোগ করুন
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create `apps/web/src/features/stock/adjust-stock-modal.tsx`**

```tsx
'use client';

import { useState } from 'react';
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
  variantId: z.string().min(1, 'Select a variant'),
  qty: z.coerce
    .number()
    .int()
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
  const [selectedProductId, setSelectedProductId] = useState('');

  const { data: productsData } = useQuery({
    queryKey: ['admin-products-all'],
    queryFn: () => productsApi.list({ limit: 200, isActive: undefined }),
    staleTime: 60_000,
  });

  const products = productsData?.data ?? [];
  const selectedProduct = products.find((p) => p._id === selectedProductId);
  const selectedVariantId = useForm<FormValues>().watch?.('variantId');
  const selectedVariant = selectedProduct?.variants.find((v) => v._id === selectedVariantId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { productId: '', variantId: '', qty: 0, note: '' },
  });

  const watchedVariantId = form.watch('variantId');
  const currentVariant = selectedProduct?.variants.find((v) => v._id === watchedVariantId);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      stockApi.adjust({
        productId: values.productId,
        variantId: values.variantId,
        qty: values.qty,
        note: values.note,
      }),
    onSuccess: () => {
      toast.success('স্টক সামঞ্জস্য হয়েছে');
      void queryClient.invalidateQueries({ queryKey: ['stock-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-products-all'] });
      form.reset();
      setSelectedProductId('');
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>স্টক সামঞ্জস্য করুন (Adjustment)</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="space-y-4 pt-2"
        >
          <div className="space-y-1.5">
            <Label>পণ্য *</Label>
            <Select
              value={form.watch('productId')}
              onValueChange={(v) => {
                setSelectedProductId(v);
                form.setValue('productId', v);
                form.setValue('variantId', '');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="পণ্য বেছে নিন" />
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

          {selectedProduct && (
            <div className="space-y-1.5">
              <Label>ভ্যারিয়েন্ট *</Label>
              <Select
                value={form.watch('variantId')}
                onValueChange={(v) => form.setValue('variantId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="ভ্যারিয়েন্ট বেছে নিন" />
                </SelectTrigger>
                <SelectContent>
                  {selectedProduct.variants.map((v) => (
                    <SelectItem key={v._id} value={v._id}>
                      {v.label} — বর্তমান স্টক: {v.stock}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.variantId && (
                <p className="text-xs text-destructive">{form.formState.errors.variantId.message}</p>
              )}
            </div>
          )}

          {currentVariant && (
            <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
              বর্তমান স্টক:{' '}
              <span className="font-bold">{currentVariant.stock} টি</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>পরিমাণ পরিবর্তন * <span className="text-xs text-muted-foreground">(ধনাত্মক = যোগ, ঋণাত্মক = বিয়োগ)</span></Label>
            <Input
              type="number"
              placeholder="+5 বা -3"
              {...form.register('qty')}
            />
            {form.formState.errors.qty && (
              <p className="text-xs text-destructive">{form.formState.errors.qty.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>কারণ / নোট *</Label>
            <Textarea
              rows={2}
              placeholder="কেন সামঞ্জস্য করা হচ্ছে..."
              {...form.register('note')}
            />
            {form.formState.errors.note && (
              <p className="text-xs text-destructive">{form.formState.errors.note.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>বাতিল</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              সামঞ্জস্য করুন
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Create `apps/web/src/app/admin/stock/page.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, Settings2, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Can } from '@/components/can';
import { stockApi, type StockMovementFilters } from '@/features/stock/stock.api';
import { AddStockModal } from '@/features/stock/add-stock-modal';
import { AdjustStockModal } from '@/features/stock/adjust-stock-modal';
import { cn } from '@/lib/utils';
import type { StockMovementType } from '@shukhilife/types';

const TYPE_LABELS: Record<StockMovementType, string> = {
  purchase: 'ক্রয়',
  sale: 'বিক্রয়',
  return_resalable: 'ফেরত (ভালো)',
  return_damaged: 'ফেরত (নষ্ট)',
  adjustment: 'সামঞ্জস্য',
};

const TYPE_COLORS: Record<StockMovementType, string> = {
  purchase: 'bg-green-100 text-green-800',
  sale: 'bg-blue-100 text-blue-800',
  return_resalable: 'bg-yellow-100 text-yellow-800',
  return_damaged: 'bg-red-100 text-red-800',
  adjustment: 'bg-gray-100 text-gray-800',
};

export default function StockPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [prefillProductId, setPrefillProductId] = useState<string | undefined>();
  const [prefillVariantId, setPrefillVariantId] = useState<string | undefined>();
  const [filters, setFilters] = useState<StockMovementFilters>({ page: 1, limit: 20 });

  const { data: summary } = useQuery({
    queryKey: ['stock-summary'],
    queryFn: () => stockApi.summary(),
    staleTime: 30_000,
  });

  const { data: movementsData, isLoading: movementsLoading } = useQuery({
    queryKey: ['stock-movements', filters],
    queryFn: () => stockApi.movements(filters),
    staleTime: 15_000,
  });

  const movements = movementsData?.data ?? [];
  const pagination = movementsData?.pagination;

  const handleAddFromLowStock = (productId: string, variantId: string) => {
    setPrefillProductId(productId);
    setPrefillVariantId(variantId);
    setAddOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">স্টক ম্যানেজমেন্ট</h1>
          {summary && (
            <p className="text-sm text-muted-foreground">
              আজকের মুভমেন্ট: {summary.todayMovementCount} টি
              {summary.lowStockVariants.length > 0 && (
                <span className="ml-2 text-orange-600 font-medium">
                  · {summary.lowStockVariants.length} টি কম স্টকে
                </span>
              )}
            </p>
          )}
        </div>
        <Can permission="stock.edit">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAdjustOpen(true)}>
              <Settings2 className="mr-1.5 h-4 w-4" />
              Adjust Stock
            </Button>
            <Button size="sm" onClick={() => { setPrefillProductId(undefined); setPrefillVariantId(undefined); setAddOpen(true); }}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Stock
            </Button>
          </div>
        </Can>
      </div>

      <Tabs defaultValue="low-stock">
        <TabsList>
          <TabsTrigger value="low-stock" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            কম স্টক
            {(summary?.lowStockVariants.length ?? 0) > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 px-1.5 text-[10px]">
                {summary?.lowStockVariants.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="movements">মুভমেন্ট লগ</TabsTrigger>
        </TabsList>

        {/* Tab 1: Low Stock */}
        <TabsContent value="low-stock" className="mt-4">
          {!summary?.lowStockVariants.length ? (
            <div className="rounded-xl border border-border bg-white p-12 text-center shadow-sm">
              <p className="text-muted-foreground">সব পণ্যের স্টক স্বাভাবিক ✓</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-white shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>পণ্য</TableHead>
                    <TableHead>ভ্যারিয়েন্ট</TableHead>
                    <TableHead className="text-right">বর্তমান স্টক</TableHead>
                    <TableHead className="text-right">সতর্কতার সীমা</TableHead>
                    <Can permission="stock.edit">
                      <TableHead />
                    </Can>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.lowStockVariants.map((v) => (
                    <TableRow key={`${v.productId}-${v.variantId}`}>
                      <TableCell className="font-medium">{v.productName}</TableCell>
                      <TableCell className="text-muted-foreground">{v.variantLabel}</TableCell>
                      <TableCell className="text-right">
                        <span className={cn('font-bold', v.stock === 0 ? 'text-destructive' : 'text-orange-600')}>
                          {v.stock}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{v.reorderPoint}</TableCell>
                      <Can permission="stock.edit">
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleAddFromLowStock(v.productId, v.variantId)}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Add Stock
                          </Button>
                        </TableCell>
                      </Can>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Movement Log */}
        <TabsContent value="movements" className="mt-4 space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Select
              value={filters.type ?? 'all'}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, type: v === 'all' ? undefined : v, page: 1 }))
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="সব ধরন" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">সব ধরন</SelectItem>
                <SelectItem value="purchase">ক্রয়</SelectItem>
                <SelectItem value="sale">বিক্রয়</SelectItem>
                <SelectItem value="return_resalable">ফেরত (ভালো)</SelectItem>
                <SelectItem value="return_damaged">ফেরত (নষ্ট)</SelectItem>
                <SelectItem value="adjustment">সামঞ্জস্য</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              className="w-40"
              value={filters.from ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value || undefined, page: 1 }))}
            />
            <Input
              type="date"
              className="w-40"
              value={filters.to ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value || undefined, page: 1 }))}
            />
          </div>

          <div className="rounded-xl border border-border bg-white shadow-sm">
            {movementsLoading ? (
              <div className="py-12 text-center text-muted-foreground text-sm">লোড হচ্ছে...</div>
            ) : movements.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">কোনো মুভমেন্ট নেই</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>তারিখ</TableHead>
                    <TableHead>পণ্য / ভ্যারিয়েন্ট</TableHead>
                    <TableHead>ধরন</TableHead>
                    <TableHead className="text-right">পরিমাণ</TableHead>
                    <TableHead>অর্ডার #</TableHead>
                    <TableHead>নোট</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m._id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(m.createdAt), 'dd MMM, hh:mm a')}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{m.productName}</p>
                        <p className="text-xs text-muted-foreground">{m.variantLabel}</p>
                      </TableCell>
                      <TableCell>
                        <span className={cn('rounded px-1.5 py-0.5 text-xs font-medium', TYPE_COLORS[m.type])}>
                          {TYPE_LABELS[m.type]}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn('font-bold text-sm flex items-center justify-end gap-0.5', m.qty > 0 ? 'text-green-600' : 'text-red-600')}>
                          {m.qty > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          {Math.abs(m.qty)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {m.orderNumber ?? '—'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                        {m.supplier ? `${m.supplier} · ` : ''}{m.note || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>মোট {pagination.total} টি</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={filters.page === 1}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                >
                  আগে
                </Button>
                <span className="flex items-center px-2">
                  {filters.page} / {pagination.totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={filters.page === pagination.totalPages}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                >
                  পরে
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AddStockModal
        open={addOpen}
        onClose={() => { setAddOpen(false); setPrefillProductId(undefined); setPrefillVariantId(undefined); }}
        prefillProductId={prefillProductId}
        prefillVariantId={prefillVariantId}
      />
      <AdjustStockModal open={adjustOpen} onClose={() => setAdjustOpen(false)} />
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

```bash
pnpm --filter @shukhilife/web type-check
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/stock/ apps/web/src/app/admin/stock/
git commit -m "feat(web): add /admin/stock page with low-stock tab, movement log, Add/Adjust modals"
```

---

## Task 8: Process Return modal + order detail update

**Files:**
- Create: `apps/web/src/features/stock/process-return-modal.tsx`
- Modify: `apps/web/src/app/admin/orders/[id]/page.tsx`

- [ ] **Step 1: Create `apps/web/src/features/stock/process-return-modal.tsx`**

```tsx
'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ordersApi } from '@/features/orders/orders.api';
import type { Order } from '@shukhilife/types';

const schema = z.object({
  items: z.array(
    z.object({
      variantId: z.string(),
      productName: z.string(),
      variantLabel: z.string(),
      orderedQty: z.number(),
      resalableQty: z.coerce.number().int().min(0),
      damagedQty: z.coerce.number().int().min(0),
    }).refine(
      (item) => item.resalableQty + item.damagedQty <= item.orderedQty,
      { message: 'Resalable + Damaged cannot exceed ordered qty', path: ['resalableQty'] },
    ),
  ),
  note: z.string().default(''),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  order: Order;
}

export function ProcessReturnModal({ open, onClose, order }: Props) {
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      items: order.items.map((item) => ({
        variantId: item.variantId,
        productName: item.productName,
        variantLabel: item.variantLabel,
        orderedQty: item.quantity,
        resalableQty: 0,
        damagedQty: 0,
      })),
      note: '',
    },
  });

  const { fields } = useFieldArray({ control: form.control, name: 'items' });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      ordersApi.processReturn(order._id, {
        items: values.items.map((item) => ({
          variantId: item.variantId,
          resalableQty: item.resalableQty,
          damagedQty: item.damagedQty,
        })),
        note: values.note,
      }),
    onSuccess: () => {
      toast.success('রিটার্ন প্রসেস হয়েছে');
      void queryClient.invalidateQueries({ queryKey: ['admin-order', order._id] });
      void queryClient.invalidateQueries({ queryKey: ['stock-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>কুরিয়ার রিটার্ন প্রসেস করুন</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="space-y-4 pt-2"
        >
          <p className="text-sm text-muted-foreground">
            প্রতিটি পণ্যের জন্য ভালো ও নষ্ট পরিমাণ লিখুন।
          </p>

          <div className="space-y-3">
            {fields.map((field, idx) => {
              const item = form.watch(`items.${idx}`);
              return (
                <div key={field.id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.variantLabel} · অর্ডার করা: {item.orderedQty} টি
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-green-700">ভালো (Resalable)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={item.orderedQty}
                        className="h-8 text-sm"
                        {...form.register(`items.${idx}.resalableQty`)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-red-700">নষ্ট (Damaged)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={item.orderedQty}
                        className="h-8 text-sm"
                        {...form.register(`items.${idx}.damagedQty`)}
                      />
                    </div>
                  </div>
                  {form.formState.errors.items?.[idx]?.resalableQty && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.items[idx]?.resalableQty?.message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <Label>নোট (ঐচ্ছিক)</Label>
            <Textarea rows={2} placeholder="রিটার্নের কারণ..." {...form.register('note')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>বাতিল</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              রিটার্ন কনফার্ম করুন
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Update `apps/web/src/app/admin/orders/[id]/page.tsx`**

Add `'Returned'` to `ORDER_STATUSES` array:

```ts
const ORDER_STATUSES: OrderStatus[] = [
  'Pending', 'Confirmed', 'Cancelled', 'Call not received', 'Fake order',
  'Hand over to Courier', 'Returned',
];
```

Add `'Returned'` to `STATUS_COLORS`:

```ts
  'Returned': 'bg-purple-100 text-purple-800',
```

Add `useState` import and `ProcessReturnModal` import at the top:

```ts
import { useState } from 'react';
import { ProcessReturnModal } from '@/features/stock/process-return-modal';
```

Inside the `OrderDetailPage` component, add state:

```ts
  const [returnOpen, setReturnOpen] = useState(false);
```

Add the "Process Return" button in the header actions section (after the sync courier button):

```tsx
          {/* Process Return */}
          {order.status === 'Hand over to Courier' && (
            <Can permission="orders.edit">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-orange-300 text-orange-700 hover:bg-orange-50"
                onClick={() => setReturnOpen(true)}
              >
                রিটার্ন প্রসেস করুন
              </Button>
            </Can>
          )}
```

Add the modal at the end of the component return (before the closing `</div>`):

```tsx
      {returnOpen && (
        <ProcessReturnModal
          open={returnOpen}
          onClose={() => setReturnOpen(false)}
          order={order}
        />
      )}
```

- [ ] **Step 3: Type-check**

```bash
pnpm --filter @shukhilife/web type-check
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/stock/process-return-modal.tsx apps/web/src/app/admin/orders/
git commit -m "feat(web): add Process Return modal on order detail page"
```

---

## Task 9: Sidebar nav item + product form reorderPoint field

**Files:**
- Modify: `apps/web/src/components/layout/admin-sidebar.tsx`
- Modify: `apps/web/src/features/products/product-form.tsx`

- [ ] **Step 1: Add Stock nav item to sidebar**

In `apps/web/src/components/layout/admin-sidebar.tsx`, add `BarChart3` to the lucide-react import:

```ts
import {
  LayoutDashboard, ShoppingBag, Users, Wallet, Package, FileText,
  Truck, Shield, UserCog, MessageSquare, X, BarChart3,
} from 'lucide-react';
```

Add the stock item to `NAV_ITEMS` array between `Products` and `Landing Pages`:

```ts
  { label: 'Stock', href: '/admin/stock', icon: BarChart3, permission: 'stock.view' },
```

The full updated array order:
```ts
const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, permission: 'dashboard.view' },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingBag, permission: 'orders.view' },
  { label: 'Customers', href: '/admin/customers', icon: Users, permission: 'customers.view' },
  { label: 'Accounts', href: '/admin/accounts', icon: Wallet, permission: 'accounts.view' },
  { label: 'Products', href: '/admin/products', icon: Package, permission: 'products.view' },
  { label: 'Stock', href: '/admin/stock', icon: BarChart3, permission: 'stock.view' },
  { label: 'Landing Pages', href: '/admin/landing-pages', icon: FileText, permission: 'landing.view' },
  { label: 'Delivery', href: '/admin/delivery', icon: Truck, permission: 'delivery.view' },
  { label: 'SMS', href: '/admin/settings', icon: MessageSquare, permission: 'settings.view' },
  { label: 'Roles', href: '/admin/roles', icon: Shield, permission: 'roles.view' },
  { label: 'Users', href: '/admin/users', icon: UserCog, permission: 'users.view' },
];
```

- [ ] **Step 2: Add `reorderPoint` to product form variant schema**

In `apps/web/src/features/products/product-form.tsx`, update `variantSchema`:

```ts
const variantSchema = z.object({
  _id: z.string().optional(),
  label: z.string().min(1, 'Label required'),
  price: z.coerce.number().min(0, 'Price must be ≥ 0'),
  stock: z.coerce.number().int().min(0, 'Stock must be ≥ 0'),
  sku: z.string().default(''),
  weight: z.coerce.number().min(0, 'Weight must be ≥ 0'),
  isDefault: z.boolean(),
  reorderPoint: z.coerce.number().int().min(0).default(0),
});
```

Update `defaultVariant()`:

```ts
function defaultVariant() {
  return { label: '', price: 0, stock: 0, sku: '', weight: 0, isDefault: false, reorderPoint: 0 };
}
```

Update `defaultValues` in `useForm` to include `reorderPoint` when editing a product:

```ts
          variants: product.variants.map((v) => ({
            _id: v._id,
            label: v.label,
            price: v.price,
            stock: v.stock,
            sku: v.sku,
            weight: v.weight,
            isDefault: v.isDefault,
            reorderPoint: v.reorderPoint ?? 0,
          })),
```

- [ ] **Step 3: Add reorderPoint input field in the variants repeater**

In the variants grid (`<div className="grid gap-3 sm:grid-cols-3">`), add a new field after the SKU field:

```tsx
                  <div className="space-y-1.5">
                    <Label className="text-xs">সতর্কতার সীমা</Label>
                    <Input
                      {...register(`variants.${idx}.reorderPoint`)}
                      type="number"
                      min={0}
                      placeholder="0"
                      className="h-8 text-sm"
                      title="Low stock alert threshold. 0 = no alert."
                    />
                  </div>
```

- [ ] **Step 4: Final type-check across all packages**

```bash
pnpm --filter @shukhilife/types build && pnpm --filter @shukhilife/api type-check && pnpm --filter @shukhilife/web type-check
```

Expected: no errors in any package.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/layout/admin-sidebar.tsx apps/web/src/features/products/product-form.tsx
git commit -m "feat(web): add Stock nav item to sidebar and reorderPoint field to product form"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ StockMovement collection with all fields
- ✅ `reorderPoint` per variant
- ✅ `'Returned'` order status
- ✅ `stock.view` / `stock.edit` permissions in types, seed, routes
- ✅ `createMovement` — single service entry point with session
- ✅ `createSaleMovements` — batch atomic decrement
- ✅ `return_damaged` does NOT update variant.stock (only audit record)
- ✅ Atomic conditional `findOneAndUpdate` for race-safe `sale` decrement
- ✅ Hard block on order creation (pre-check + atomic)
- ✅ `POST /api/admin/stock/movements` — purchase receipt
- ✅ `POST /api/admin/stock/adjust` — manual adjustment (note required)
- ✅ `GET /api/admin/stock/summary` — low-stock + today count
- ✅ `GET /api/admin/stock/movements` — paginated log with filters
- ✅ `POST /api/admin/orders/:id/return` — per-item resalable + damaged split
- ✅ `/admin/stock` page — two tabs (Low Stock + Movement Log)
- ✅ Add Stock modal with optional fields (cost, supplier, date, reference)
- ✅ Adjust Stock modal (signed qty, note required)
- ✅ Process Return modal — per item with validation
- ✅ Process Return button on order detail (only for `Hand over to Courier`)
- ✅ Product form — `reorderPoint` field per variant
- ✅ Admin sidebar — Stock nav item
