# Kamiab Prokashon — SP2 Book Data Model + Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `Product` with book metadata + MRP + preview, add nested `Category` and `Banner` collections with admin CRUD and public read endpoints, and update the admin product form — so products are managed as books.

**Architecture:** Three layers in dependency order: (A) shared types in `packages/types`, (B) backend models + routes + seed in `apps/api`, (C) admin UI in `apps/web`. All `Product`/variant additions are optional → backward compatible. `Product.category` stays a string holding a category slug (no data migration). Follow existing patterns exactly (route files contain logic + co-located Zod; no separate controllers).

**Tech Stack:** TypeScript, Express, Mongoose, Zod, Next.js 14 App Router, TanStack Query, React Hook Form, shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-06-15-kamiab-sp2-book-data-model-admin-design.md`

**Conventions / verification note:** No unit-test framework is present in this repo; tasks verify with `pnpm -r type-check`, `pnpm --filter api build`, `pnpm --filter web build`, and targeted `grep`. Run all commands from repo root `/Users/afnanmahmud/Documents/kamiab-prokason`. ESM imports in `apps/api` use `.js` extensions. Every commit message ends with the trailer:

```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

---

## PART A — Shared types (`packages/types`)

### Task A1: Extend product types

**Files:**
- Modify: `packages/types/src/product.ts`

- [ ] **Step 1: Add `regularPrice` to `ProductVariant`**

In `ProductVariant`, after `price: number;` add:

```ts
  regularPrice?: number; // MRP; shown struck-through when > price
```

- [ ] **Step 2: Add a `PreviewPdf` type and book fields to `Product`**

Add this interface near `ProductImage`:

```ts
export interface PreviewPdf {
  url: string;
  publicId: string;
}
```

In `Product`, after `category: string;` add:

```ts
  author?: string;
  publisher?: string;
  translator?: string;
  language?: string;
  binding?: string;
  edition?: string;
  isbn?: string;
  pages?: number;
  publicationYear?: number;
  previewImages?: ProductImage[];
  previewPdf?: PreviewPdf | null;
```

- [ ] **Step 3: Mirror new fields in `CreateProductInput`**

In `CreateProductInput`, add the same optional book fields, `previewImages?: ProductImage[]`, and `previewPdf?: PreviewPdf | null`. (`UpdateProductInput` is `Partial<CreateProductInput>`, no change needed.) The variant `regularPrice` flows automatically via `Omit<ProductVariant, '_id'>[]`.

- [ ] **Step 4: Verify + commit**

Run: `pnpm --filter @shukhilife/types build` (or `pnpm -r type-check`)
Expected: PASS.

```bash
git add packages/types/src/product.ts
git commit -m "feat(types): add book fields, MRP, and preview to Product"
```

---

### Task A2: Category type

**Files:**
- Create: `packages/types/src/category.ts`

- [ ] **Step 1: Create the file**

```ts
export interface CategoryImage {
  url: string;
  publicId: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  parent: string | null;
  image?: CategoryImage | null;
  order: number;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Tree node returned by the public endpoint
export interface CategoryNode extends Category {
  children: CategoryNode[];
}

export interface CreateCategoryInput {
  name: string;
  slug?: string;
  parent?: string | null;
  image?: CategoryImage | null;
  order?: number;
  isActive?: boolean;
}

export type UpdateCategoryInput = Partial<CreateCategoryInput>;
```

- [ ] **Step 2: Commit** (export wired in Task A4)

```bash
git add packages/types/src/category.ts
git commit -m "feat(types): add Category types"
```

---

### Task A3: Banner type

**Files:**
- Create: `packages/types/src/banner.ts`

- [ ] **Step 1: Create the file**

```ts
export interface BannerImage {
  url: string;
  publicId: string;
}

export interface Banner {
  _id: string;
  title?: string;
  desktopImage: BannerImage;
  mobileImage: BannerImage;
  link?: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBannerInput {
  title?: string;
  desktopImage: BannerImage;
  mobileImage: BannerImage;
  link?: string;
  order?: number;
  isActive?: boolean;
}

export type UpdateBannerInput = Partial<CreateBannerInput>;
```

- [ ] **Step 2: Commit**

```bash
git add packages/types/src/banner.ts
git commit -m "feat(types): add Banner types"
```

---

### Task A4: Permissions + barrel exports

**Files:**
- Modify: `packages/types/src/auth.ts:35-37`
- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Add permission keys**

In the `Permission` union in `auth.ts`, before the final `| 'stock.view'` block (keep ordering tidy), add:

```ts
  | 'categories.view'
  | 'categories.create'
  | 'categories.edit'
  | 'categories.delete'
  | 'banners.view'
  | 'banners.create'
  | 'banners.edit'
  | 'banners.delete'
```

- [ ] **Step 2: Export new type modules**

In `index.ts`, add:

```ts
export * from './category.js';
export * from './banner.js';
```

- [ ] **Step 3: Verify + commit**

Run: `pnpm -r type-check`
Expected: PASS.

```bash
git add packages/types/src/auth.ts packages/types/src/index.ts
git commit -m "feat(types): add categories/banners permissions and exports"
```

---

## PART B — Backend (`apps/api`)

### Task B1: Extend Product Mongoose model

**Files:**
- Modify: `apps/api/src/models/Product.ts`

- [ ] **Step 1: Extend the TS interfaces**

In `IProductVariant` add `regularPrice?: number;`. In `IProduct`, after `category: string;` add the same optional fields as Task A1 Step 2 (author, publisher, translator, language, binding, edition, isbn as `string`; pages, publicationYear as `number`; `previewImages?: IProductImage[]`; `previewPdf?: { url: string; publicId: string } | null`).

- [ ] **Step 2: Add `regularPrice` to `variantSchema`**

In `variantSchema`, after the `price` field add:

```ts
    regularPrice: { type: Number, min: 0 },
```

- [ ] **Step 3: Add a preview-pdf sub-schema and product fields**

Before `productSchema`, add:

```ts
const previewPdfSchema = new Schema<{ url: string; publicId: string }>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false },
);
```

In `productSchema`, after `category`, add:

```ts
    author: { type: String, trim: true },
    publisher: { type: String, trim: true },
    translator: { type: String, trim: true },
    language: { type: String, trim: true },
    binding: { type: String, trim: true },
    edition: { type: String, trim: true },
    isbn: { type: String, trim: true },
    pages: { type: Number, min: 0 },
    publicationYear: { type: Number, min: 0 },
    previewImages: { type: [imageSchema], default: undefined },
    previewPdf: { type: previewPdfSchema, default: undefined },
```

- [ ] **Step 4: Verify + commit**

Run: `pnpm --filter api build`
Expected: PASS.

```bash
git add apps/api/src/models/Product.ts
git commit -m "feat(api): extend Product model with book fields, MRP, preview"
```

---

### Task B2: Category model

**Files:**
- Create: `apps/api/src/models/Category.ts`

- [ ] **Step 1: Create the model**

```ts
import { Schema, model, type Document, type Types } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  slug: string;
  parent: Types.ObjectId | null;
  image?: { url: string; publicId: string } | null;
  order: number;
  isActive: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const imageSchema = new Schema<{ url: string; publicId: string }>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false },
);

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    image: { type: imageSchema, default: undefined },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ parent: 1 });
categorySchema.index({ isActive: 1 });

export const Category = model<ICategory>('Category', categorySchema);
```

- [ ] **Step 2: Verify + commit**

Run: `pnpm --filter api build`
Expected: PASS.

```bash
git add apps/api/src/models/Category.ts
git commit -m "feat(api): add Category model"
```

---

### Task B3: Banner model

**Files:**
- Create: `apps/api/src/models/Banner.ts`

- [ ] **Step 1: Create the model**

```ts
import { Schema, model, type Document } from 'mongoose';

export interface IBanner extends Document {
  title?: string;
  desktopImage: { url: string; publicId: string };
  mobileImage: { url: string; publicId: string };
  link?: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const imageSchema = new Schema<{ url: string; publicId: string }>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false },
);

const bannerSchema = new Schema<IBanner>(
  {
    title: { type: String, trim: true },
    desktopImage: { type: imageSchema, required: true },
    mobileImage: { type: imageSchema, required: true },
    link: { type: String, trim: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

bannerSchema.index({ isActive: 1, order: 1 });

export const Banner = model<IBanner>('Banner', bannerSchema);
```

- [ ] **Step 2: Verify + commit**

Run: `pnpm --filter api build`
Expected: PASS.

```bash
git add apps/api/src/models/Banner.ts
git commit -m "feat(api): add Banner model"
```

---

### Task B4: Register new models in barrel

**Files:**
- Modify: `apps/api/src/models/index.ts`

- [ ] **Step 1: Add exports**

Add to the model exports block:

```ts
export { Category } from './Category.js';
export { Banner } from './Banner.js';
```

Add to the type exports block:

```ts
export type { ICategory } from './Category.js';
export type { IBanner } from './Banner.js';
```

- [ ] **Step 2: Verify + commit**

Run: `pnpm --filter api build`
Expected: PASS.

```bash
git add apps/api/src/models/index.ts
git commit -m "feat(api): export Category and Banner models"
```

---

### Task B5: PDF upload endpoint

**Files:**
- Modify: `apps/api/src/routes/admin/upload.routes.ts`

- [ ] **Step 1: Add a PDF multer instance and route**

After the `uploadVideo` multer definition add:

```ts
const uploadPdf = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter(_req, file, cb) {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Only PDF files are allowed'));
      return;
    }
    cb(null, true);
  },
});
```

Before `export default router;` add:

```ts
// POST /api/admin/upload/pdf — book preview sample
router.post(
  '/pdf',
  requirePermission('products.create'),
  uploadPdf.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        sendError(res, 'No file provided', 400, 'BAD_REQUEST');
        return;
      }
      const result = await uploadImage(req.file.buffer, {
        mimetype: req.file.mimetype,
        originalName: req.file.originalname,
        folder: 'preview-pdfs',
        req,
      });
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  },
);
```

- [ ] **Step 2: Verify the storage service accepts the call shape**

Read `apps/api/src/services/storage.service.ts` to confirm `uploadImage(buffer, { mimetype, originalName, folder, req })` is the correct signature (the `/video` route already passes `folder`). If `uploadImage` cannot handle a `application/pdf` mimetype for Cloudinary, pass the appropriate `resource_type`/options it supports (raw or auto) — adapt to the actual service API. Do not invent options the service doesn't expose; report DONE_WITH_CONCERNS if PDF storage needs a service change beyond a folder param.

- [ ] **Step 3: Verify + commit**

Run: `pnpm --filter api build`
Expected: PASS.

```bash
git add apps/api/src/routes/admin/upload.routes.ts
git commit -m "feat(api): add PDF upload endpoint for book previews"
```

---

### Task B6: Extend product route validation

**Files:**
- Modify: `apps/api/src/routes/admin/products.routes.ts:11-49`

- [ ] **Step 1: Add `regularPrice` to the Zod `variantSchema`**

In the route's `variantSchema`, after `price: z.number().min(0),` add:

```ts
  regularPrice: z.number().min(0).optional(),
```

- [ ] **Step 2: Add book fields + preview to the Zod `productSchema`**

In `productSchema`, after `category: z.string().min(1).trim(),` add:

```ts
  author: z.string().trim().optional(),
  publisher: z.string().trim().optional(),
  translator: z.string().trim().optional(),
  language: z.string().trim().optional(),
  binding: z.string().trim().optional(),
  edition: z.string().trim().optional(),
  isbn: z.string().trim().optional(),
  pages: z.number().min(0).optional(),
  publicationYear: z.number().min(0).optional(),
  previewImages: z.array(imageSchema).optional(),
  previewPdf: z.object({ url: z.string().url(), publicId: z.string() }).nullable().optional(),
```

(The existing `Object.assign(product, rest)` create/patch flow persists these automatically — no handler change needed.)

- [ ] **Step 3: Verify + commit**

Run: `pnpm --filter api build`
Expected: PASS.

```bash
git add apps/api/src/routes/admin/products.routes.ts
git commit -m "feat(api): accept book fields, MRP, preview in product validation"
```

---

### Task B7: Admin categories CRUD route

**Files:**
- Create: `apps/api/src/routes/admin/categories.routes.ts`
- Modify: `apps/api/src/routes/admin/index.ts`

- [ ] **Step 1: Create the route file**

Follow the exact patterns in `apps/api/src/routes/admin/products.routes.ts` (Router, Zod, `requirePermission`, `sendSuccess`/`sendError`). Implement:

```ts
import { Router } from 'express';
import { z } from 'zod';
import { Category } from '../../models/Category.js';
import { Product } from '../../models/Product.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { sendSuccess, sendError } from '../../utils/api-response.js';

const router: Router = Router();

const imageSchema = z.object({ url: z.string().url(), publicId: z.string() });

const categorySchema = z.object({
  name: z.string().min(1).trim(),
  slug: z.string().min(1).toLowerCase().trim(),
  parent: z.string().nullable().optional(),
  image: imageSchema.nullable().optional(),
  order: z.number().default(0),
  isActive: z.boolean().default(true),
});

// GET /api/admin/categories — full flat list (incl. inactive, excl. deleted)
router.get('/', requirePermission('categories.view'), async (_req, res, next) => {
  try {
    const categories = await Category.find({ deletedAt: null })
      .sort({ order: 1, name: 1 })
      .lean();
    sendSuccess(res, categories);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/categories
router.post('/', requirePermission('categories.create'), async (req, res, next) => {
  try {
    const data = categorySchema.parse(req.body);
    const slugTaken = await Category.findOne({ slug: data.slug, deletedAt: null });
    if (slugTaken) {
      sendError(res, 'Slug already in use', 409, 'DUPLICATE_KEY');
      return;
    }
    const category = await Category.create({ ...data, parent: data.parent ?? null });
    sendSuccess(res, category, 201);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/categories/:id
router.patch('/:id', requirePermission('categories.edit'), async (req, res, next) => {
  try {
    const category = await Category.findOne({ _id: req.params['id'], deletedAt: null });
    if (!category) {
      sendError(res, 'Category not found', 404, 'NOT_FOUND');
      return;
    }
    const data = categorySchema.partial().parse(req.body);
    if (data.slug && data.slug !== category.slug) {
      const slugTaken = await Category.findOne({
        slug: data.slug,
        _id: { $ne: category._id },
        deletedAt: null,
      });
      if (slugTaken) {
        sendError(res, 'Slug already in use', 409, 'DUPLICATE_KEY');
        return;
      }
    }
    // Prevent setting parent to self
    if (data.parent && String(data.parent) === String(category._id)) {
      sendError(res, 'Category cannot be its own parent', 400, 'BAD_REQUEST');
      return;
    }
    Object.assign(category, data);
    await category.save();
    sendSuccess(res, category);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/categories/:id — soft delete, blocked if referenced
router.delete('/:id', requirePermission('categories.delete'), async (req, res, next) => {
  try {
    const category = await Category.findOne({ _id: req.params['id'], deletedAt: null });
    if (!category) {
      sendError(res, 'Category not found', 404, 'NOT_FOUND');
      return;
    }
    const childCount = await Category.countDocuments({ parent: category._id, deletedAt: null });
    if (childCount > 0) {
      sendError(res, 'Category has sub-categories; delete or move them first', 409, 'HAS_CHILDREN');
      return;
    }
    const productCount = await Product.countDocuments({ category: category.slug, deletedAt: null });
    if (productCount > 0) {
      sendError(res, 'Category has products; reassign them first', 409, 'HAS_PRODUCTS');
      return;
    }
    category.deletedAt = new Date();
    category.isActive = false;
    await category.save();
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 2: Register the router**

In `apps/api/src/routes/admin/index.ts`, add the import `import categoriesRouter from './categories.routes.js';` and `router.use('/categories', categoriesRouter);`.

- [ ] **Step 3: Verify + commit**

Run: `pnpm --filter api build`
Expected: PASS.

```bash
git add apps/api/src/routes/admin/categories.routes.ts apps/api/src/routes/admin/index.ts
git commit -m "feat(api): admin categories CRUD with referential delete guard"
```

---

### Task B8: Admin banners CRUD route

**Files:**
- Create: `apps/api/src/routes/admin/banners.routes.ts`
- Modify: `apps/api/src/routes/admin/index.ts`

- [ ] **Step 1: Create the route file**

```ts
import { Router } from 'express';
import { z } from 'zod';
import { Banner } from '../../models/Banner.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { sendSuccess, sendError } from '../../utils/api-response.js';

const router: Router = Router();

const imageSchema = z.object({ url: z.string().url(), publicId: z.string() });

const bannerSchema = z.object({
  title: z.string().trim().optional(),
  desktopImage: imageSchema,
  mobileImage: imageSchema,
  link: z.string().trim().optional(),
  order: z.number().default(0),
  isActive: z.boolean().default(true),
});

// GET /api/admin/banners
router.get('/', requirePermission('banners.view'), async (_req, res, next) => {
  try {
    const banners = await Banner.find().sort({ order: 1, createdAt: -1 }).lean();
    sendSuccess(res, banners);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/banners
router.post('/', requirePermission('banners.create'), async (req, res, next) => {
  try {
    const data = bannerSchema.parse(req.body);
    const banner = await Banner.create(data);
    sendSuccess(res, banner, 201);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/banners/:id
router.patch('/:id', requirePermission('banners.edit'), async (req, res, next) => {
  try {
    const banner = await Banner.findById(req.params['id']);
    if (!banner) {
      sendError(res, 'Banner not found', 404, 'NOT_FOUND');
      return;
    }
    const data = bannerSchema.partial().parse(req.body);
    Object.assign(banner, data);
    await banner.save();
    sendSuccess(res, banner);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/banners/:id
router.delete('/:id', requirePermission('banners.delete'), async (req, res, next) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params['id']);
    if (!banner) {
      sendError(res, 'Banner not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 2: Register the router**

In `apps/api/src/routes/admin/index.ts`, add `import bannersRouter from './banners.routes.js';` and `router.use('/banners', bannersRouter);`.

- [ ] **Step 3: Verify + commit**

Run: `pnpm --filter api build`
Expected: PASS.

```bash
git add apps/api/src/routes/admin/banners.routes.ts apps/api/src/routes/admin/index.ts
git commit -m "feat(api): admin banners CRUD"
```

---

### Task B9: Public categories + banners endpoints

**Files:**
- Create: `apps/api/src/routes/public/categories.routes.ts`
- Create: `apps/api/src/routes/public/banners.routes.ts`
- Modify: `apps/api/src/routes/public/index.ts`

- [ ] **Step 1: Create the public categories route (active tree)**

```ts
import { Router } from 'express';
import { Category } from '../../models/Category.js';
import { sendSuccess } from '../../utils/api-response.js';

const router: Router = Router();

interface TreeNode {
  _id: string;
  children: TreeNode[];
  [key: string]: unknown;
}

// GET /api/categories — active category tree, ordered
router.get('/', async (_req, res, next) => {
  try {
    const cats = await Category.find({ isActive: true, deletedAt: null })
      .sort({ order: 1, name: 1 })
      .lean();

    const byId = new Map<string, TreeNode>();
    cats.forEach((c) => byId.set(String(c._id), { ...c, _id: String(c._id), children: [] }));

    const roots: TreeNode[] = [];
    byId.forEach((node) => {
      const parentId = node['parent'] ? String(node['parent']) : null;
      if (parentId && byId.has(parentId)) {
        byId.get(parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    });

    sendSuccess(res, roots);
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 2: Create the public banners route**

```ts
import { Router } from 'express';
import { Banner } from '../../models/Banner.js';
import { sendSuccess } from '../../utils/api-response.js';

const router: Router = Router();

// GET /api/banners — active banners, ordered
router.get('/', async (_req, res, next) => {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ order: 1 }).lean();
    sendSuccess(res, banners);
  } catch (err) {
    next(err);
  }
});

export default router;
```

- [ ] **Step 3: Register both**

In `apps/api/src/routes/public/index.ts`, add imports and:

```ts
router.use('/categories', categoriesRouter);
router.use('/banners', bannersRouter);
```

- [ ] **Step 4: Verify + commit**

Run: `pnpm --filter api build`
Expected: PASS.

```bash
git add apps/api/src/routes/public/categories.routes.ts apps/api/src/routes/public/banners.routes.ts apps/api/src/routes/public/index.ts
git commit -m "feat(api): public categories tree and banners endpoints"
```

---

### Task B10: Seed new permissions

**Files:**
- Modify: `apps/api/src/scripts/seed.ts:10-22`

- [ ] **Step 1: Add the new keys to `ALL_PERMISSIONS`**

In the `ALL_PERMISSIONS` array, after the `products.*` line add:

```ts
  'categories.view', 'categories.create', 'categories.edit', 'categories.delete',
  'banners.view', 'banners.create', 'banners.edit', 'banners.delete',
```

(The seed already re-syncs the Admin role's permissions on every run, so existing Admin roles gain these on next seed.)

- [ ] **Step 2: Verify + commit**

Run: `pnpm --filter api build`
Expected: PASS.

```bash
git add apps/api/src/scripts/seed.ts
git commit -m "feat(api): seed categories/banners permissions for Admin"
```

---

## PART C — Admin UI (`apps/web`)

> For all Part C tasks: first READ the named existing pattern files and mirror their
> structure (imports, `apiClient` usage, TanStack Query keys, shadcn components, toast).
> Admin pages live at `apps/web/src/app/admin/<feature>/page.tsx`; feature API modules at
> `apps/web/src/features/<feature>/<feature>.api.ts`.

### Task C1: Categories admin (api + page + nav)

**Files:**
- Create: `apps/web/src/features/categories/categories.api.ts`
- Create: `apps/web/src/app/admin/categories/page.tsx`
- Modify: `apps/web/src/components/layout/admin-sidebar.tsx`

- [ ] **Step 1: Read patterns**

Read `apps/web/src/features/roles/roles.api.ts` (CRUD api shape) and `apps/web/src/app/admin/roles/page.tsx` (list + create/edit modal + delete with `<Can>` gating) and `apps/web/src/lib/api-client.ts`.

- [ ] **Step 2: Create `categories.api.ts`**

Export a `categoriesApi` object with `list()`, `create(input: CreateCategoryInput)`, `update(id, input: UpdateCategoryInput)`, `remove(id)` calling `/admin/categories` via the shared api client, typed with `Category`, `CreateCategoryInput`, `UpdateCategoryInput` from `@shukhilife/types`. Mirror the exact client/error pattern in `roles.api.ts`.

- [ ] **Step 3: Create the categories page**

`'use client'` page using TanStack Query (`useQuery` for list, `useMutation` for create/update/delete with `queryClient.invalidateQueries`). UI:
- Header with a "New Category" button (gated `<Can permission="categories.create">`).
- A list rendering categories with one level of indentation for children (compute children by `parent === cat._id`; render roots, then their children indented). Show name, slug, order, active toggle, Edit, Delete.
- Create/Edit dialog (shadcn `Dialog`) with React Hook Form + Zod: `name` (required), `slug` (auto-generate from name via a slugify helper — lowercase, spaces→`-`, strip non-url chars; editable), `parent` (a `Select` listing existing top-level + child categories, plus a "None (top level)" option; exclude the category itself when editing), `image` (reuse the existing image upload component/pattern used in `product-form.tsx` → stores `{url, publicId}`), `order` (number), `isActive` (switch).
- Delete: confirm, then call `remove`; on a 409 error show the server message via `toast.error` (don't crash).

- [ ] **Step 4: Add sidebar nav item**

In `admin-sidebar.tsx`, import a suitable icon (e.g. `FolderTree`) from `lucide-react`, and add to `NAV_ITEMS` after the Products entry:

```tsx
  { label: 'Categories', href: '/admin/categories', icon: FolderTree, permission: 'categories.view' },
```

- [ ] **Step 5: Verify + commit**

Run: `pnpm --filter web type-check && pnpm --filter web build`
Expected: PASS.

```bash
git add apps/web/src/features/categories apps/web/src/app/admin/categories apps/web/src/components/layout/admin-sidebar.tsx
git commit -m "feat(admin): categories management UI"
```

---

### Task C2: Banners admin (api + page + nav)

**Files:**
- Create: `apps/web/src/features/banners/banners.api.ts`
- Create: `apps/web/src/app/admin/banners/page.tsx`
- Modify: `apps/web/src/components/layout/admin-sidebar.tsx`

- [ ] **Step 1: Read patterns**

Re-use the same patterns from Task C1 plus the image-upload approach in `product-form.tsx`.

- [ ] **Step 2: Create `banners.api.ts`**

Export `bannersApi` with `list()`, `create(input: CreateBannerInput)`, `update(id, input)`, `remove(id)` against `/admin/banners`, typed with `Banner`, `CreateBannerInput`, `UpdateBannerInput`.

- [ ] **Step 3: Create the banners page**

`'use client'` page: list banners ordered by `order` showing the desktop image thumbnail, title, order, active toggle, Edit, Delete (gated by `<Can>`). Create/Edit dialog with: desktop image upload (required), mobile image upload (required), `title` (optional), `link` (optional), `order` (number), `isActive` (switch). Both images use the existing image-upload pattern → `{url, publicId}`.

- [ ] **Step 4: Add sidebar nav item**

Add icon (e.g. `Images`) and to `NAV_ITEMS` after Categories:

```tsx
  { label: 'Banners', href: '/admin/banners', icon: Images, permission: 'banners.view' },
```

- [ ] **Step 5: Verify + commit**

Run: `pnpm --filter web type-check && pnpm --filter web build`
Expected: PASS.

```bash
git add apps/web/src/features/banners apps/web/src/app/admin/banners apps/web/src/components/layout/admin-sidebar.tsx
git commit -m "feat(admin): banners management UI"
```

---

### Task C3: Product form — book fields, MRP, category dropdown, preview

**Files:**
- Modify: `apps/web/src/features/products/product-form.tsx`
- Modify: the product form Zod schema (co-located `schemas` file or inline in `product-form.tsx` — locate it first)

- [ ] **Step 1: Read the current form**

Read `apps/web/src/features/products/product-form.tsx` fully and its Zod schema. Identify the variant repeater, the image upload helper, and where `category` is currently entered.

- [ ] **Step 2: Add a "Book details" section**

Add optional inputs (React Hook Form) for: `author`, `publisher`, `translator`, `language`, `binding`, `edition`, `isbn` (text), `pages`, `publicationYear` (number). Group them in a card/section labelled "Book details". Extend the form's Zod schema with these as optional fields and include them in the submit payload.

- [ ] **Step 3: Category dropdown from managed categories**

Replace the current free-text/category input with a shadcn `Select` populated from `categoriesApi.list()` (TanStack Query). Show nesting (indent or "Parent → Child" labels). The selected value stored into `category` is the category **slug**. Keep it required.

- [ ] **Step 4: Per-variant MRP**

In each variant row, add a `regularPrice` (MRP) number input next to `price`. Add `regularPrice: z.coerce.number().min(0).optional()` to the variant Zod schema and include it in the payload.

- [ ] **Step 5: Preview ("Read a little") block**

Add a section with: a multi-image uploader (reuse the existing product image upload pattern → array of `{url, publicId, alt}` → `previewImages`) and a single PDF uploader that POSTs to `/admin/upload/pdf` (one file; on success store `{url, publicId}` → `previewPdf`; allow removing it). Both optional. Add `previewImages` and `previewPdf` to the Zod schema and payload.

- [ ] **Step 6: Verify + commit**

Run: `pnpm --filter web type-check && pnpm --filter web build`
Expected: PASS.

```bash
git add apps/web/src/features/products
git commit -m "feat(admin): book fields, MRP, category dropdown & preview in product form"
```

---

### Task C4: Roles permission grid

**Files:**
- Modify: `apps/web/src/app/admin/roles/page.tsx` (and any shared permission-list constant it uses)

- [ ] **Step 1: Locate the permission catalog**

Read `apps/web/src/app/admin/roles/page.tsx`. Find where the permission checkboxes are defined (a grouped list/constant of permission keys). If permissions are derived dynamically from a shared list, locate that list.

- [ ] **Step 2: Add the new permission groups**

Add "Categories" (`categories.view/create/edit/delete`) and "Banners" (`banners.view/create/edit/delete`) groups to the grid so they can be assigned to non-Admin roles. Match the existing grouping/label format exactly.

- [ ] **Step 3: Verify + commit**

Run: `pnpm --filter web type-check && pnpm --filter web build`
Expected: PASS.

```bash
git add apps/web/src/app/admin/roles
git commit -m "feat(admin): add categories/banners to roles permission grid"
```

---

## Final verification

- [ ] **Step 1: Full monorepo checks**

Run: `pnpm -r type-check && pnpm --filter api build && pnpm --filter web build`
Expected: all PASS.

- [ ] **Step 2: Backward-compat sanity (manual, optional)**

If a dev DB is available: run `pnpm --filter api ... seed` per the repo's seed script, start the API, and confirm `GET /api/categories` and `GET /api/banners` return `{ data: [] }`; create a category and a product (with a selected category + book fields + MRP + a preview image) via the admin UI and confirm they persist and re-load for editing.

- [ ] **Step 3: Confirm spec coverage**

Check: Product book fields + MRP + preview (Tasks A1/B1/B6/C3); Category nested model + CRUD + public tree (A2/B2/B7/B9/C1); Banner model + CRUD + public (A3/B3/B8/B9/C2); permissions (A4/B10/C4); admin nav (C1/C2). No item missing.
