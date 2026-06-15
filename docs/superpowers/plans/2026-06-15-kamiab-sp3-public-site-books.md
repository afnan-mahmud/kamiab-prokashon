# Kamiab Prokashon — SP3 Public Site (Books) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use `- [ ]` checkboxes.

**Goal:** Redesign the public site (header, home, shop, book card, book detail with order-popup + preview modal, static pages) for a book store, plus minimal backend filter additions.

**Architecture:** Backend gets price-range + nested-category filtering on the public products list. Frontend rewrites the public surfaces to present books (portrait covers, MRP/discount, author), wired to the SP2 `/api/categories` tree and `/api/banners`. Follow existing patterns; reuse `BRAND`, `formatPrice`, `PublicLayout`, shadcn `Dialog`/`Tabs`/`Select`.

**Tech Stack:** Next.js 14 App Router, TypeScript, Tailwind, shadcn/ui, TanStack Query, Zustand cart.

**Spec:** `docs/superpowers/specs/2026-06-15-kamiab-sp3-public-site-books-design.md`

**Conventions:** No unit-test framework; verify with `pnpm -r type-check`, `pnpm --filter api build`, `pnpm --filter web build`. Run from repo root. `apps/api` ESM imports use `.js`. Commit trailer on every commit:

```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

---

## PART A — Backend filters

### Task A1: Price range + nested category on public products

**Files:** Modify `apps/api/src/routes/public/products.routes.ts`

- [ ] **Step 1: Add a descendant-slug resolver and price/category filter**

Add an import: `import { Category } from '../../models/Category.js';`

Replace the filter-building block in `GET /` (the lines that set `filter['search']`/`filter['category']`) with:

```ts
    const filter: Record<string, unknown> = { isActive: true, deletedAt: null };
    if (req.query['search']) filter['$text'] = { $search: String(req.query['search']) };

    if (req.query['category']) {
      const slug = String(req.query['category']);
      const cats = await Category.find({ isActive: true, deletedAt: null })
        .select('slug parent _id')
        .lean();
      const match = cats.find((c) => c.slug === slug);
      if (match) {
        const childrenByParent = new Map<string, typeof cats>();
        cats.forEach((c) => {
          const key = c.parent ? String(c.parent) : 'root';
          const arr = childrenByParent.get(key) ?? [];
          arr.push(c);
          childrenByParent.set(key, arr);
        });
        const slugs: string[] = [];
        const stack = [match];
        while (stack.length) {
          const cur = stack.pop()!;
          slugs.push(cur.slug);
          (childrenByParent.get(String(cur._id)) ?? []).forEach((ch) => stack.push(ch));
        }
        filter['category'] = { $in: slugs };
      } else {
        filter['category'] = slug; // unknown slug → exact match fallback
      }
    }

    const minPrice = req.query['minPrice'] ? Number(req.query['minPrice']) : undefined;
    const maxPrice = req.query['maxPrice'] ? Number(req.query['maxPrice']) : undefined;
    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceCond: Record<string, number> = {};
      if (minPrice !== undefined) priceCond['$gte'] = minPrice;
      if (maxPrice !== undefined) priceCond['$lte'] = maxPrice;
      filter['variants'] = { $elemMatch: { price: priceCond } };
    }
```

- [ ] **Step 2: Verify + commit**

Run: `pnpm --filter api build`
Expected: PASS.

```bash
git add apps/api/src/routes/public/products.routes.ts
git commit -m "feat(api): price-range and nested-category filtering on public products"
```

---

## PART B — Data layer + formatting helper

### Task B1: Extend shop API + discount helper

**Files:**
- Modify: `apps/web/src/features/shop/shop.api.ts`
- Modify: `apps/web/src/lib/format.ts`

- [ ] **Step 1: Extend filters and add tree/banners methods**

In `shop.api.ts`: add `minPrice?: number;` and `maxPrice?: number;` to `PublicProductFilters`. Import `CategoryNode, Banner` from `@shukhilife/types`. Add to `shopApi`:

```ts
  categoryTree: () => apiClient.get<CategoryNode[]>('/categories'),
  banners: () => apiClient.get<Banner[]>('/banners'),
```

(Keep the existing `categories()` method.)

- [ ] **Step 2: Add `discountPercent` to `format.ts`**

```ts
// Returns the integer discount percent when regular > price, else null.
export function discountPercent(regular?: number, price?: number): number | null {
  if (!regular || !price || regular <= price) return null;
  return Math.round(((regular - price) / regular) * 100);
}
```

- [ ] **Step 3: Verify + commit**

Run: `pnpm --filter web type-check`
Expected: PASS.

```bash
git add apps/web/src/features/shop/shop.api.ts apps/web/src/lib/format.ts
git commit -m "feat(web): shop API category-tree/banners + discountPercent helper"
```

---

## PART C — Book product card

### Task C1: Rewrite ProductCard for books

**Files:** Modify `apps/web/src/components/public/product-card.tsx`

- [ ] **Step 1: Read** the current `product-card.tsx` (keep the `handleAddToCart` logic, pixel/gtm events, cart store usage exactly).

- [ ] **Step 2: Rewrite the markup** to a book card:
  - Cover wrapper: `aspect-[3/4]`, `object-contain` on a `bg-muted/40` surface (book covers, not square crops).
  - When `discountPercent(defaultVariant?.regularPrice, defaultVariant?.price)` is non-null, render a badge on the cover's top-left: `-{toBengali(pct)}%` (use the existing `toBengali`), styled with `bg-accent text-white` (brand blue) rounded.
  - Title: 2-line clamp (existing style).
  - Author line under title: `{product.author}` in `text-xs text-muted-foreground`, rendered only when `product.author` is truthy. (Drop the old category line, or keep it small if author absent.)
  - Price row: bold `formatPrice(defaultVariant.price)`; when discounted, a struck-through `formatPrice(defaultVariant.regularPrice!)` in `text-xs text-muted-foreground line-through` beside it. Keep the round add-to-cart icon button with its handler.
  - Import `discountPercent` and `toBengali` from `@/lib/format`.

- [ ] **Step 3: Verify + commit**

Run: `pnpm --filter web type-check && pnpm --filter web build`
Expected: PASS.

```bash
git add apps/web/src/components/public/product-card.tsx
git commit -m "feat(web): book-style product card with cover, author, MRP/discount"
```

---

## PART D — Header

### Task D1: Rewrite public header (search + category menu)

**Files:** Modify `apps/web/src/components/layout/public-header.tsx`

- [ ] **Step 1: Read** the current header (keep cart badge logic, mobile menu pattern, `BRAND` alt).

- [ ] **Step 2: Implement** a two-area header:
  - Top row: logo (left), a centered search `Input` with a search icon and a submit button; submitting (Enter or button) does `router.push('/shop?search=' + encodeURIComponent(q))` (use `next/navigation` `useRouter`). Cart icon (right) unchanged.
  - Desktop second row: fetch `shopApi.categoryTree()` via TanStack Query (`queryKey: ['public-category-tree']`, `staleTime: 5*60_000`). Render top-level categories as a horizontal list; each with children renders a hover/focus dropdown listing child links. Every category links to `/shop?category=<slug>`. Append `Home` (`/`), `Shop` (`/shop`), `Contact` (`/contact`).
  - Mobile: keep search visible; hamburger opens a panel containing the category tree as a simple accordion (top-level expandable to children) plus the nav links. Close on navigation.
  - No `any`. Guard empty/loading category data.

- [ ] **Step 3: Verify + commit**

Run: `pnpm --filter web type-check && pnpm --filter web build`
Expected: PASS.

```bash
git add apps/web/src/components/layout/public-header.tsx
git commit -m "feat(web): search bar + nested category menu in public header"
```

---

## PART E — Home

### Task E1: Hero banner carousel component

**Files:** Create `apps/web/src/components/public/hero-carousel.tsx`

- [ ] **Step 1: Build a lightweight client carousel** (no new dependency):
  - `'use client'`. Props: `banners: Banner[]`.
  - State `index`; `useEffect` autoplay every 5s (clear on unmount; pause optional). Prev/next buttons and clickable dots.
  - Each slide: a link to `banner.link || '#'` wrapping a responsive image — `banner.desktopImage.url` shown on `md:` and up, `banner.mobileImage.url` on smaller (use two `<Image>` with `hidden md:block` / `md:hidden`, or `<picture>`). Use `next/image` with appropriate `sizes`, `priority` on the first slide.
  - Render nothing if `banners.length === 0`.

- [ ] **Step 2: Verify + commit**

Run: `pnpm --filter web type-check`
Expected: PASS.

```bash
git add apps/web/src/components/public/hero-carousel.tsx
git commit -m "feat(web): hero banner carousel component"
```

### Task E2: Rewrite home page

**Files:** Modify `apps/web/src/app/page.tsx`

- [ ] **Step 1: Rewrite** the home page:
  - `'use client'` (it now fetches). Fetch `shopApi.banners()` and render `<HeroCarousel banners={...} />` (hidden when empty).
  - "নতুন বই" section: `useQuery(['home-new'], () => shopApi.products({ sort: 'newest', limit: 12 }))` → grid of `<ProductCard>` with a "সব দেখুন" link to `/shop`.
  - "বেস্ট সেলিং বই" section: `shopApi.products({ sort: 'popular', limit: 12 })` → grid.
  - Feature strip: three items — অরিজিনাল বই (icon `BookOpen`), ক্যাশ অন ডেলিভারি (icon `Wallet`/`HandCoins`), দ্রুত ডেলিভারি (icon `Truck`) — brand styling.
  - Grid: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` (book covers are narrow). Loading skeletons like the shop page.
  - Use `PublicLayout`.

- [ ] **Step 2: Verify + commit**

Run: `pnpm --filter web type-check && pnpm --filter web build`
Expected: PASS.

```bash
git add apps/web/src/app/page.tsx
git commit -m "feat(web): book-store home with hero slider, new arrivals, bestsellers"
```

---

## PART F — Shop

### Task F1: Rewrite shop page (nested category + price + sort, URL-driven)

**Files:** Modify `apps/web/src/app/shop/page.tsx`

- [ ] **Step 1: Read** the current shop page (reuse its sort options, pagination, skeleton, search box).

- [ ] **Step 2: Rewrite**:
  - Initialise `search` and `category` from URL query (`useSearchParams`); update the URL (or just local state) when they change. (Wrap `useSearchParams` usage per Next.js App Router rules; the page is `'use client'`.)
  - Fetch `shopApi.categoryTree()` for the sidebar; build a slug→name map for chips/labels.
  - Desktop left sidebar: nested category list (top-level + indented children), active slug highlighted, "সব" resets; below it a price range (two number inputs `minPrice`/`maxPrice` + "প্রয়োগ করুন"). On mobile, render these inside a Sheet/drawer toggled by a "ফিল্টার" button (a simple slide-over `div` is fine — no new dep needed).
  - Top bar: search input (+ button) and a sort `Select` (newest/popular/price_asc/price_desc).
  - Pass `minPrice`, `maxPrice`, `category`, `search`, `sort`, `page` to `shopApi.products`; reset to page 1 on any filter change.
  - Keep the grid (`<ProductCard>`), empty state, and pagination. Use `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`.

- [ ] **Step 3: Verify + commit**

Run: `pnpm --filter web type-check && pnpm --filter web build`
Expected: PASS.

```bash
git add apps/web/src/app/shop/page.tsx
git commit -m "feat(web): shop with nested category, price range, sort, URL deep-links"
```

---

## PART G — Book detail + popups

### Task G1: Book preview modal

**Files:** Create `apps/web/src/components/public/book-preview-modal.tsx`

- [ ] **Step 1: Build** a `'use client'` component using shadcn `Dialog` (+ `Tabs` when both media exist):
  - Props: `open: boolean; onOpenChange: (o: boolean) => void; images?: ProductImage[]; pdf?: { url: string; publicId: string } | null; title: string`.
  - If `images?.length`: an image viewer with current index, prev/next buttons, and a counter (`{toBengali(i+1)}/{toBengali(n)}`), `next/image` or plain `<img>` constrained to the dialog.
  - If `pdf`: an `<iframe src={pdf.url} className="h-[70vh] w-full" />`.
  - If both: shadcn `Tabs` — "পাতা" (images) and "পিডিএফ" (iframe). If only one, show it directly.
  - Dialog title uses `title` ("একটু পড়ে দেখুন — {title}").

- [ ] **Step 2: Verify + commit**

Run: `pnpm --filter web type-check`
Expected: PASS.

```bash
git add apps/web/src/components/public/book-preview-modal.tsx
git commit -m "feat(web): book preview modal (image lightbox + PDF)"
```

### Task G2: Rewrite book detail page (order popup, preview, specs, MRP)

**Files:** Modify `apps/web/src/app/products/[slug]/page.tsx`

- [ ] **Step 1: Read** the current detail page (keep `useQuery` for product + suggested, the gallery/thumbnail logic, variant selection state, qty stepper, stock logic, pixel/gtm `ViewContent`/`AddToCart`).

- [ ] **Step 2: Rewrite** the layout + interactions:
  - Cover gallery: change the main image container to `aspect-[3/4]` with `object-contain`. Below it (or beside CTAs), a **"একটু পড়ে দেখুন"** button rendered only when `product.previewImages?.length || product.previewPdf`; it sets `previewOpen=true`. Render `<BookPreviewModal open={previewOpen} onOpenChange={setPreviewOpen} images={product.previewImages} pdf={product.previewPdf} title={product.name} />`.
  - Info column: resolved category name (optional — can keep `product.category`), title, an author/publisher line (`লেখক: {author}` · `প্রকাশনী: {publisher}` when present), **price block**: `formatPrice(selectedVariant.price)` bold + struck `formatPrice(selectedVariant.regularPrice!)` + `-{toBengali(pct)}%` badge when `discountPercent` non-null.
  - Variant selector: render only when `product.variants.length > 1` (existing pill UI).
  - Quantity stepper: keep.
  - CTAs: primary **অর্ডার করুন** (calls `handleAddToCart()` then `setOrderPopupOpen(true)`) and secondary **কার্টে যোগ করুন** (calls `handleAddToCart()` + toast, stays). Keep the `inStock` disabling.
  - **Order popup** (shadcn `Dialog`, state `orderPopupOpen`): heading "বইটি কার্টে যোগ হয়েছে", body shows the title, and two buttons: **চেকআউট করুন** → `router.push('/checkout')`; **আরও বই দেখুন** → `setOrderPopupOpen(false)`.
  - **Specs table:** a definition list / `table` rendering only the present fields among: লেখক (author), প্রকাশনী (publisher), অনুবাদক (translator), পৃষ্ঠা (pages, `toBengali`), ভাষা (language), বাঁধাই (binding), সংস্করণ (edition), ISBN (isbn), প্রকাশকাল (publicationYear, `toBengali`).
  - Keep description block and suggested-books section.
  - Imports: `discountPercent`, `toBengali`, `formatPrice` from `@/lib/format`; `BookPreviewModal`; shadcn `Dialog`.

- [ ] **Step 3: Verify + commit**

Run: `pnpm --filter web type-check && pnpm --filter web build`
Expected: PASS.

```bash
git add apps/web/src/app/products/[slug]/page.tsx
git commit -m "feat(web): book detail page with order popup, preview, specs, MRP"
```

---

## PART H — Static pages

### Task H1: Contact / Privacy / Return pages

**Files:**
- Create: `apps/web/src/app/contact/page.tsx`
- Create: `apps/web/src/app/privacy/page.tsx`
- Create: `apps/web/src/app/return/page.tsx`

- [ ] **Step 1: Contact page**

`PublicLayout`-wrapped page using `BRAND`: a heading "যোগাযোগ", and cards/rows for phone (`BRAND.phone`), email (`BRAND.email`), address (`BRAND.address`), and a Facebook link (`BRAND.facebook`) with Lucide icons (`Phone`, `Mail`, `MapPin`, `Facebook`). Bengali labels. (Server component is fine — no client hooks.)

- [ ] **Step 2: Privacy + Return pages**

Two `PublicLayout`-wrapped static pages with readable Bengali policy copy (privacy policy: data use, COD, contact; return policy: return window, conditions, process). Headings + paragraphs in `prose`-like styling. Reasonable default copy the client can edit later.

- [ ] **Step 3: Verify + commit**

Run: `pnpm --filter web type-check && pnpm --filter web build`
Expected: PASS.

```bash
git add apps/web/src/app/contact apps/web/src/app/privacy apps/web/src/app/return
git commit -m "feat(web): contact, privacy, and return static pages"
```

---

## Final verification

- [ ] `pnpm -r type-check && pnpm --filter api build && pnpm --filter web build` all PASS.
- [ ] Spec coverage: backend filters (A1); card (C1); header search+menu (D1); home slider/new/bestsellers (E1/E2); shop filters+deep-links (F1); detail order-popup+preview+specs+MRP (G1/G2); static pages (H1). No item missing.
- [ ] Manual (if dev DB seeded): home slider rotates; category menu deep-links; shop parent-category returns children's books + price filter; detail order popup + preview modal work; static pages resolve.
