# SP4 — Landing Pages for Books (Kamiab Prokashon)

**Date:** 2026-06-15
**Status:** Approved direction, pending implementation plan
**Depends on:** SP1, SP2, SP3 (all merged to main)

## Background

The landing-page system (admin builder + 4 templates + public renderer at
`/step/[slug]` + bottom checkout form) was built for organic-food single-product
campaigns. SP4 adapts it for books: it adds book-specific content sections, retargets
the food-oriented copy/defaults, and applies the Kamiab Prokashon brand colors that SP1
deliberately deferred for these files.

This is the fourth and final sub-project.

## Goals

- Add book-specific landing section types: **book specs**, **সূচিপত্র (table of contents)**,
  **লেখক পরিচিতি (author bio)**, and **preview ("একটু পড়ে দেখুন")**.
- Make these usable in the admin builder and rendered by all four templates.
- Replace the deferred old-brand colors in the landing feature with the brand palette
  (`#8dc53d` primary, `#0065b3` accent) and retarget food-specific default labels to books.

## Non-goals

- No new template designs (the 4 existing templates stay; we extend their section
  rendering). No change to the checkout/order flow or conversion tracking.
- No change to hero media (image/video) handling.

## Design decisions

New content section types (added to the existing union: text, image, video, features,
testimonial, faq, why_product, why_us, reviews):

- **`book_specs`** — `{ type: 'book_specs'; title?: string }`. Renders the **linked
  product's** book fields (author, publisher, translator, pages, language, binding,
  edition, isbn, publicationYear) as a specs table — admin does not re-enter them (DRY).
  Only present fields show. Default title "বই পরিচিতি".
- **`toc`** — `{ type: 'toc'; title?: string; items: string[] }`. সূচিপত্র: an ordered list
  of chapter/section titles entered by the admin. Default title "সূচিপত্র".
- **`author_bio`** — `{ type: 'author_bio'; name: string; bio: string; image?: ProductImage | null }`.
  লেখক পরিচিতি: author name, a bio paragraph, and an optional portrait image.
- **`preview`** — `{ type: 'preview'; title?: string }`. Renders the **linked product's**
  `previewImages` / `previewPdf` (reuses the SP3 `BookPreviewModal` as the viewer, opened
  by an "একটু পড়ে দেখুন" button). If the product has no preview, the section renders
  nothing. Default title "একটু পড়ে দেখুন".

`book_specs` and `preview` pull from the linked product (templates already receive the
`product` prop); `toc` and `author_bio` carry their own data.

### Brand retargeting

- Builder default content colors and each template's fallback color constants: replace
  `#4a7c2e` → `#8dc53d` and `#d97706` → `#0065b3` throughout the
  `apps/web/src/features/landing-pages/**` files (these were intentionally skipped in SP1).
  The TEMPLATES swatch colors in the builder may also be updated for consistency.
- Builder section-picker label "কেন খাবেন আমাদের পণ্য?" (why_product) → "কেন পড়বেন এই বইটি?"
  (the stored data is unchanged; only the picker label / default heading is retargeted).

## Data model / types (`packages/types/src/landing-page.ts`)

- Extend `ContentSectionType` with `'book_specs' | 'toc' | 'author_bio' | 'preview'`.
- Add interfaces `BookSpecsSection`, `TocSection`, `AuthorBioSection`, `PreviewSection`
  (shapes above; `author_bio` image uses `ProductImage`), and add them to the
  `ContentSection` union.

## Backend (`apps/api/src/routes/admin/landing-pages.routes.ts`)

- Add four variants to the `contentSectionSchema` `z.discriminatedUnion('type', [...])`:
  - `z.object({ type: z.literal('book_specs'), title: z.string().optional() })`
  - `z.object({ type: z.literal('toc'), title: z.string().optional(), items: z.array(z.string()) })`
  - `z.object({ type: z.literal('author_bio'), name: z.string(), bio: z.string(), image: z.object({ url: z.string(), publicId: z.string(), alt: z.string().default('') }).nullable().optional() })`
  - `z.object({ type: z.literal('preview'), title: z.string().optional() })`

## Admin builder (`apps/web/src/features/landing-pages/landing-page-builder.tsx`)

- Add the four types to the "add section" picker list with Bengali labels
  (বই পরিচিতি / সূচিপত্র / লেখক পরিচিতি / একটু পড়ে দেখুন).
- Add `newSection` defaults for each in the add-section switch.
- Add editor UIs:
  - `book_specs`: a title input + a note ("লিঙ্ক করা বইয়ের তথ্য স্বয়ংক্রিয়ভাবে দেখানো হবে").
  - `toc`: title input + a repeatable list of string inputs (add/remove/reorder rows).
  - `author_bio`: name input, bio textarea, single image upload (reuse the builder's
    existing image-upload helper) with remove.
  - `preview`: a title input + a note that the linked product's preview will be shown.
- Update the default content colors and retarget the why_product label as above.

## Templates (`apps/web/src/features/landing-pages/templates/*`)

- Create a shared `book-sections.tsx` exporting presentational components:
  `BookSpecsSection({ section, product, colors })`, `TocSection({ section, colors })`,
  `AuthorBioSection({ section, colors })`, `PreviewSection({ section, product })` (the last
  reuses `BookPreviewModal` from `@/components/public/book-preview-modal`).
- In each of `template1..4`'s section `switch`, add the four `case`s delegating to these
  shared components (passing the template's resolved `primary`/`accent` colors and the
  `product`). This keeps per-template layout while avoiding duplicated section markup.
- Update each template's fallback color constants to the brand palette.

## Verification

- `pnpm -r type-check`, `pnpm --filter api build`, `pnpm --filter web build` pass.
- In the admin builder a landing page can add all four new sections; `book_specs`/`preview`
  show a note; `toc` accepts multiple rows; `author_bio` accepts name/bio/image; saving
  round-trips (reload shows the data).
- On the public `/step/[slug]` page (all four templates): `book_specs` shows the linked
  book's populated fields only; `toc` lists the entered items; `author_bio` shows name/bio
  (+ image if set); `preview` shows the "একটু পড়ে দেখুন" button → modal only when the
  product has a preview, otherwise nothing.
- Landing pages render in brand green/blue (no leftover `#4a7c2e`/`#d97706` in the landing
  feature): `grep -rn "4a7c2e\|d97706" apps/web/src/features/landing-pages` returns nothing.
- Existing landing pages (without the new sections) still render unchanged.

## Open items

- `book_specs`/`preview` rely on the linked product having book fields/preview set; if not,
  those sections degrade gracefully (specs shows nothing / preview hidden).
