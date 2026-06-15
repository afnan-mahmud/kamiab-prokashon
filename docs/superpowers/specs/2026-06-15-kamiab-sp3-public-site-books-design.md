# SP3 — Public Site Redesign for Books (Kamiab Prokashon)

**Date:** 2026-06-15
**Status:** Approved design, pending implementation plan
**Depends on:** SP1 (rebrand), SP2 (book data model + admin) — both merged to main

## Background

With the book data model and admin in place (SP2), SP3 redesigns the **public-facing**
site for a book store, modelled on wafilife.com / rokomari.com: a portrait book card,
a search-forward header with a nested category menu, a home page with a banner slider +
new arrivals + bestsellers, a shop page with nested-category + price + sort filters, and
a book detail page with an "order → cart popup" flow and a "একটু পড়ে দেখুন" preview
modal. Plus the contact/privacy/return static pages deferred from SP1.

This is the third of four sub-projects. SP4 (landing pages for books) is separate.

## Goals

- Make every public surface present products as **books** (cover, author, MRP/discount).
- Drive discovery via header search + nested category menu + shop filters.
- Implement the agreed detail-page interactions: order → "added to cart" popup
  (Checkout / Buy more) and the "Read a little" preview modal (images + PDF).
- Ship contact / privacy / return pages.

## Non-goals

- Landing pages (SP4). Author/Publisher browse pages (v2). Customer accounts/wishlist.
- Changing the cart/checkout flow itself (existing cart + checkout stay; we only add the
  order popup entry point and book-aware cart data, which already works via variants).

## Design decisions (locked during brainstorming)

- Header has a **prominent search bar** (→ `/shop?search=`).
- Shop filters: **nested category**, **price range**, **sort**. (No author/publisher filter.)
- Build **contact, privacy, return** static pages.
- Layout conventions (chosen, book-store standard): portrait covers, MRP struck-through +
  discount % badge, autoplay hero slider, order-popup dialog, preview modal with image
  lightbox and/or PDF iframe.

## Backend (`apps/api`) — minimal additions

`apps/api/src/routes/public/products.routes.ts`, `GET /api/products`:

- **Price range:** accept `minPrice` / `maxPrice`; filter
  `variants: { $elemMatch: { price: { $gte, $lte } } }` (matches if any variant is in range).
- **Nested category:** when `category` (a slug) is provided, resolve it and all its
  descendant category slugs from the `Category` collection (active, non-deleted) and filter
  `category: { $in: [slug, ...descendantSlugs] }`. If the slug is unknown, fall back to an
  exact match (current behaviour). Build the descendant set by loading active categories and
  walking the parent→children map (handles multi-level nesting).

No other backend changes — home uses the existing `/api/products?sort=newest|popular&limit=`,
`/api/categories` (tree) and `/api/banners` already exist from SP2.

## Frontend (`apps/web`)

### Data layer (`apps/web/src/features/shop/shop.api.ts`)

- Extend `PublicProductFilters` with `minPrice?` / `maxPrice?`.
- Add `categoryTree(): CategoryNode[]` → `GET /categories` and `banners(): Banner[]`
  → `GET /banners`. Keep the existing `categories()` (distinct strings) only if still used;
  prefer the tree everywhere.

### Formatting (`apps/web/src/lib/format.ts`)

- Add `discountPercent(regular?: number, price?: number): number | null`
  (`null` unless `regular > price`; else `Math.round((regular-price)/regular*100)`).
- Reuse existing `formatPrice` (Bengali digits + ৳) for both sell price and MRP.

### Book ProductCard (`apps/web/src/components/public/product-card.tsx` — rewrite)

Portrait cover (aspect-[3/4], `object-contain` on a light surface — book covers are not
square), a discount badge on the cover corner when `discountPercent` is non-null, title
(2-line clamp), author line (`product.author`, hidden if absent), price row: bold sell
price + struck-through MRP (`defaultVariant.regularPrice`) when discounted. Keep the quick
add-to-cart icon button (existing pixel/gtm events preserved). Falls back gracefully when
fields are missing (existing non-book products still render).

### Header (`apps/web/src/components/layout/public-header.tsx` — rewrite)

Top row: logo + a centered search input (Enter or button → `/shop?search=<q>`) + cart icon.
Second row (desktop): a **category menu** built from `categoryTree()` — top-level items with
a dropdown of children (link to `/shop?category=<slug>`), plus Home / Shop / Contact links.
Mobile: search stays visible; hamburger opens a panel with the category tree as an accordion
+ the nav links. Uses `BRAND` for the logo alt.

### Home (`apps/web/src/app/page.tsx` — rewrite)

- **Hero slider:** a client carousel over `banners()` (autoplay ~5s, swipe/dots, prev/next),
  rendering `desktopImage` on `md+` and `mobileImage` below, each wrapped in a link to
  `banner.link` when present. Graceful empty state (hide section if no banners).
- **নতুন বই** (new arrivals): `products({ sort: 'newest', limit: 12 })` in a book grid.
- **বেস্ট সেলিং** (bestsellers): `products({ sort: 'popular', limit: 12 })`.
- A book-relevant feature strip (অরিজিনাল বই / ক্যাশ অন ডেলিভারি / দ্রুত ডেলিভারি).
- Each section has a "সব দেখুন" → `/shop`.

### Shop (`apps/web/src/app/shop/page.tsx` — rewrite)

- Reads initial `search` / `category` from URL query (so header search & category menu deep-link).
- Left sidebar (desktop): nested category tree (`categoryTree()`) with the active slug
  highlighted; a price range (min/max number inputs + apply). On mobile these live in a
  Sheet/drawer opened by a "ফিল্টার" button.
- Top bar: search input + sort dropdown (newest / popular / price_asc / price_desc).
- Book grid (ProductCard) + existing pagination. Category labels resolved slug→name from the
  tree. Active-filter chips with clear.
- Wires `minPrice`/`maxPrice` and nested `category` to `shopApi.products`.

### Book detail (`apps/web/src/app/products/[slug]/page.tsx` — rewrite)

- Two columns. Left: portrait cover gallery (main + thumbnails) and, when
  `previewImages?.length || previewPdf`, a **"একটু পড়ে দেখুন"** button that opens the
  preview modal.
- Right: category (resolved name), title, author/publisher line, **price block**
  (sell price + struck MRP + discount % for the selected variant), variant selector shown
  only when `variants.length > 1`, quantity stepper, primary **অর্ডার করুন** button and a
  secondary **কার্টে যোগ করুন**.
- **Order flow:** "অর্ডার করুন" adds the selected variant×qty to the cart and opens an
  **order popup** (Dialog): "বইটি কার্টে যোগ হয়েছে" with **চেকআউট করুন** (→ `/checkout`)
  and **আরও বই দেখুন** (close). "কার্টে যোগ করুন" adds silently (toast) and stays.
- **Specs table:** rows for whichever of author, publisher, translator, pages, language,
  binding, edition, isbn, publicationYear are present (omit empty).
- Description, then suggested books (existing `suggested` endpoint).
- Preserve existing pixel/gtm ViewContent + AddToCart events.

### Preview modal (`apps/web/src/components/public/book-preview-modal.tsx` — new)

A Dialog that, given `previewImages` and/or `previewPdf`: shows an image lightbox/slider
(prev/next, counter) for images, and an embedded PDF (`<iframe>`/`<embed>`) for the PDF;
when both exist, show images with a clearly-labelled link/tab to the PDF. Mobile-friendly
sizing. Closes on overlay/escape.

### Static pages

- `apps/web/src/app/contact/page.tsx` — phone, email, address, Facebook from `BRAND`,
  short intro; optional embedded map link.
- `apps/web/src/app/privacy/page.tsx`, `apps/web/src/app/return/page.tsx` — readable
  Bengali policy copy under `PublicLayout`. (Reasonable default copy; client can edit later.)

## Verification

- `pnpm -r type-check`, `pnpm --filter api build`, `pnpm --filter web build` pass.
- Home: banner slider rotates (with seeded banners); new arrivals & bestsellers show book
  cards with covers, author, and MRP/discount where set.
- Header search routes to `/shop?search=`; category menu deep-links to `/shop?category=`.
- Shop: selecting a parent category returns its and its children's books; price range filters;
  sort works; pagination works; URL deep-links work.
- Detail: "অর্ডার করুন" → item in cart + popup with working Checkout / Buy-more; "একটু পড়ে
  দেখুন" appears only when preview exists and shows images and/or the PDF; specs table shows
  only populated fields; MRP/discount render with Bengali digits.
- `/contact`, `/privacy`, `/return` render and their header/footer links resolve.
- Existing non-book products (no author/MRP/preview) still render without errors.

## Open items

- Hero slider: implemented with a lightweight custom carousel (no new heavy dependency)
  unless an embla/shadcn carousel is already present in the repo, in which case reuse it.
