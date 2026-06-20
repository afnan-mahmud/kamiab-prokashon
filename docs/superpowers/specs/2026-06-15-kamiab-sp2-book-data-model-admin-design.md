# SP2 — Book Data Model + Admin (Kamiab Prokashon)

**Date:** 2026-06-15
**Status:** Approved design, pending implementation plan
**Depends on:** SP1 (foundation & rebrand, merged to main)

## Background

Kamiab Prokashon is an Islamic book publisher/seller. The platform was built for
organic-food retail (`Product` with weight-based variants). SP2 extends the data
model and admin panel so products can be managed as **books**, and introduces two new
managed collections — **Category** (nested) and **Banner** (hero slider) — plus the
public read endpoints those features need.

This is the second of four sub-projects (see SP1 spec for the full decomposition).
SP2 is **data model + admin + public read endpoints only**. The public-facing book
card, detail page, preview modal, home slider rendering, shop filters, and category
menu are **SP3**.

## Goals

- Extend `Product` with book metadata, MRP/discount pricing, and a "read a little" preview.
- Add a nested `Category` collection with admin CRUD and a public read endpoint.
- Add a `Banner` collection (desktop + mobile images) with admin CRUD and a public read endpoint.
- Update the admin product form to capture all new book data.
- Add `categories.*` and `banners.*` permissions and gate the new admin nav.

## Non-goals (SP3 / later)

- Public rendering: header category menu, home hero slider, shop filters, book product
  card, book detail page layout, "একটু পড়ে দেখুন" preview modal. SP2 only ships the
  data + admin + public GET endpoints these will consume.
- Author/Publisher as browsable entities (deferred to v2 per brainstorming; they remain
  plain text fields here).
- Renaming internal `@kamiab/*` package identifiers.

## Design decisions (locked during brainstorming)

- **Book fields:** all included, all optional — `author, publisher, translator, language,
  binding, edition, isbn` (string), `pages, publicationYear` (number).
- **Pricing:** MRP lives on the variant as `regularPrice?` (optional). `price` stays the
  sell price. Discount % is derived (`regularPrice > price`), not stored.
- **Preview ("Read a little"):** `previewImages?: ProductImage[]` and
  `previewPdf?: { url, publicId } | null` on `Product`. Both optional. (SP3 shows the
  button when either is present.)
- **Categories:** nested (parent → sub) via a self-referencing `parent` pointer.
  `Product.category` stays a **string holding the category slug** — no breaking migration
  of existing products; the admin form selects from managed categories.
- **Banners:** separate `desktopImage` and `mobileImage`.

## Data model

### `Product` — extend (`packages/types/src/product.ts` + `apps/api/src/models/Product.ts`)

New optional fields on `Product` / `IProduct`:

```ts
author?: string;
publisher?: string;
translator?: string;
language?: string;
binding?: string;        // e.g. "হার্ডকভার" / "পেপারব্যাক"
edition?: string;
isbn?: string;
pages?: number;
publicationYear?: number;
previewImages?: ProductImage[];
previewPdf?: { url: string; publicId: string } | null;
```

New optional field on `ProductVariant` / `IProductVariant`:

```ts
regularPrice?: number;   // MRP; sell price stays `price`
```

Mongoose: add to `productSchema` (strings `trim`, numbers `min: 0`), reuse the existing
`imageSchema` for `previewImages`, add a small `_id:false` sub-schema for `previewPdf`,
add `regularPrice: { type: Number, min: 0 }` to `variantSchema`. Existing `category`
(required string) and the one-default-variant validator are unchanged. `CreateProductInput`
/ `UpdateProductInput` gain the new fields.

### `Category` — new (`packages/types/src/category.ts` + `apps/api/src/models/Category.ts`)

```ts
interface Category {
  _id: string;
  name: string;
  slug: string;            // unique
  parent: string | null;   // ref Category (null = top level)
  image?: { url: string; publicId: string } | null;
  order: number;
  isActive: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

- Schema: `slug` unique+indexed, `parent` `ObjectId | null` ref `'Category'` indexed,
  `order` default 0, `isActive` default true, `deletedAt` default null, timestamps.
- `CreateCategoryInput` / `UpdateCategoryInput` mirror SP1/product conventions.
- Public tree shape `CategoryNode = Category & { children: CategoryNode[] }` built server-side.

### `Banner` — new (`packages/types/src/banner.ts` + `apps/api/src/models/Banner.ts`)

```ts
interface Banner {
  _id: string;
  title?: string;
  desktopImage: { url: string; publicId: string };
  mobileImage: { url: string; publicId: string };
  link?: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

- Schema: both images required sub-docs (`_id:false`), `link` optional string, `order`
  default 0, `isActive` default true, timestamps.

All new types exported from `packages/types/src/index.ts`.

## Backend (`apps/api`)

### PDF upload endpoint

Add `POST /api/admin/upload/pdf` to `apps/api/src/routes/admin/upload.routes.ts`: a
multer instance accepting only `application/pdf` (limit 10 MB), stored via the existing
`uploadImage` storage service with a `preview-pdfs` folder. Returns `{ url, publicId }`.
Permission `products.create` (same as image upload).

### Admin CRUD routes

- `apps/api/src/routes/admin/categories.routes.ts` — `GET /` (flat list, incl. inactive,
  for admin), `POST /`, `PATCH /:id`, `DELETE /:id` (soft delete; **block with 409 if the
  category has non-deleted children or any product whose `category` equals its slug**).
  Gated by `categories.view/create/edit/delete`.
- `apps/api/src/routes/admin/banners.routes.ts` — `GET /`, `POST /`, `PATCH /:id`,
  `DELETE /:id` (hard delete acceptable; banners carry no references). Gated by
  `banners.view/create/edit/delete`.
- Register both in `apps/api/src/routes/admin/index.ts` (`/categories`, `/banners`).
- Zod validation co-located per existing route conventions.

### Public read endpoints

- `apps/api/src/routes/public/categories.routes.ts` — `GET /api/categories` returns the
  **active** category tree (`CategoryNode[]`, ordered by `order` then `name`).
- `apps/api/src/routes/public/banners.routes.ts` — `GET /api/banners` returns **active**
  banners ordered by `order`.
- Register both in `apps/api/src/routes/public/index.ts`.

### Product validation

Extend the product create/update Zod schemas (in `products.routes.ts`) to accept all new
optional book fields, `regularPrice` per variant, `previewImages`, and `previewPdf`.

## Permissions (`packages/types/src/auth.ts` + seed)

Add to the `Permission` union:

```
categories.view, categories.create, categories.edit, categories.delete
banners.view, banners.create, banners.edit, banners.delete
```

Ensure the system **Admin** role receives all permissions (the seed/role logic that
grants Admin every permission must include the new keys — verify the seed enumerates the
full permission list or derives it). Frontend permission list (any hardcoded grid in the
roles UI) gains the new keys grouped under "Categories" and "Banners".

## Admin UI (`apps/web`)

### Product form (`apps/web/src/features/products/product-form.tsx` + schema)

- New **"Book details"** section: inputs for author, publisher, translator, pages
  (number), language, binding, isbn, publicationYear (number), edition. All optional.
- **Category**: replace the free-text/category input with a **dropdown** populated from
  `GET /api/admin/categories`, showing nesting (e.g. indented "Parent → Child"); stores
  the selected category **slug** into `category`.
- **MRP**: add a `regularPrice` (MRP) input to each variant row, beside `price`.
- **Preview**: a "Read a little" block — multi-image upload (reuses image upload →
  `previewImages`) and a single PDF upload (→ `/upload/pdf` → `previewPdf`), each
  removable. Both optional.
- Update the form's Zod schema and the create/update payload mapping accordingly.

### Categories page (`apps/web/src/app/admin/categories/page.tsx` + feature api)

- Tree/indented list of categories with order, active toggle, edit, delete.
- Create/Edit modal: name (slug auto-generated, editable), parent select (top-level or an
  existing category; prevent selecting self/descendant), image upload, order, active.
- Delete: if API returns 409 (has children/products), show a clear toast; otherwise confirm.

### Banners page (`apps/web/src/app/admin/banners/page.tsx` + feature api)

- List ordered by `order` with desktop thumbnail, active toggle, edit, delete, and order
  controls (up/down or numeric order field).
- Create/Edit modal: desktop image upload, mobile image upload, link (optional), title
  (optional), order, active.

### Navigation & gating

- Add "Categories" and "Banners" items to `apps/web/src/components/layout/admin-sidebar.tsx`
  (`NAV_ITEMS`), each wrapped by `<Can permission="categories.view" />` /
  `<Can permission="banners.view" />`, with suitable Lucide icons (e.g. `FolderTree`,
  `Images`), placed near "Products".
- New feature API modules under `apps/web/src/features/categories/` and
  `apps/web/src/features/banners/` following existing `*.api.ts` + TanStack Query patterns.

## Verification

- `pnpm -r type-check` and `pnpm --filter web build` and `pnpm --filter api build` pass.
- A new product can be created via admin with book fields, MRP, a category selected from
  the managed list, and preview images + PDF; it round-trips (GET shows the data).
- Categories: create parent + child; child appears nested; deleting a category that has a
  child or a product returns 409 and the UI surfaces it; deleting an empty leaf succeeds.
- Banners: create with desktop + mobile images; ordering respected.
- Public: `GET /api/categories` returns only active categories as an ordered tree;
  `GET /api/banners` returns only active banners ordered by `order`.
- Existing products (with no book fields) still load and edit without error
  (backward compatibility).

## Open items

- PDF rendering/lightbox in the public preview modal is SP3; SP2 only stores the PDF and
  exposes its URL.
