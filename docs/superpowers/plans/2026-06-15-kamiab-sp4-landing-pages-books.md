# Kamiab Prokashon — SP4 Landing Pages (Books) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]` checkboxes.

**Goal:** Add four book-specific landing section types (book_specs, toc, author_bio, preview), wire them through the admin builder and all four templates, and retarget the landing feature's deferred food colors/copy to the Kamiab Prokashon brand.

**Architecture:** Extend the `ContentSection` union + backend Zod; add editor UIs in the builder; add a shared `book-sections.tsx` presentational module rendered from each template's `SectionRenderer` (templates pass the linked `product` and resolved colors). `book_specs`/`preview` derive from the linked product; `toc`/`author_bio` carry own data.

**Tech Stack:** TypeScript, Express, Zod, Next.js App Router, Tailwind, shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-06-15-kamiab-sp4-landing-pages-books-design.md`

**Conventions:** verify with `pnpm -r type-check`, `pnpm --filter api build`, `pnpm --filter web build`. `apps/api` ESM `.js` imports. Commit trailer on every commit:

```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

---

### Task A1: Extend landing types

**Files:** Modify `packages/types/src/landing-page.ts`

- [ ] **Step 1: Add types**

Extend `ContentSectionType` with `| 'book_specs' | 'toc' | 'author_bio' | 'preview'`. Add interfaces and union members:

```ts
export interface BookSpecsSection {
  type: 'book_specs';
  title?: string;
}

export interface TocSection {
  type: 'toc';
  title?: string;
  items: string[];
}

export interface AuthorBioSection {
  type: 'author_bio';
  name: string;
  bio: string;
  image?: ProductImage | null;
}

export interface PreviewSection {
  type: 'preview';
  title?: string;
}
```

Add `| BookSpecsSection | TocSection | AuthorBioSection | PreviewSection` to the `ContentSection` union. (`ProductImage` is already imported.)

- [ ] **Step 2: Verify + commit**

Run: `pnpm -r type-check` (may need `pnpm --filter @kamiab/types build` first)
Expected: PASS.

```bash
git add packages/types/src/landing-page.ts
git commit -m "feat(types): add book landing section types"
```

---

### Task B1: Backend Zod for new sections

**Files:** Modify `apps/api/src/routes/admin/landing-pages.routes.ts`

- [ ] **Step 1: Add four discriminated-union variants**

In `contentSectionSchema` (the `z.discriminatedUnion('type', [...])`), add:

```ts
  z.object({ type: z.literal('book_specs'), title: z.string().optional() }),
  z.object({ type: z.literal('toc'), title: z.string().optional(), items: z.array(z.string()) }),
  z.object({
    type: z.literal('author_bio'),
    name: z.string(),
    bio: z.string(),
    image: z.object({ url: z.string(), publicId: z.string(), alt: z.string().default('') }).nullable().optional(),
  }),
  z.object({ type: z.literal('preview'), title: z.string().optional() }),
```

- [ ] **Step 2: Verify + commit**

Run: `pnpm --filter api build`
Expected: PASS.

```bash
git add apps/api/src/routes/admin/landing-pages.routes.ts
git commit -m "feat(api): validate book landing section types"
```

---

### Task C1: Shared book-section components

**Files:** Create `apps/web/src/features/landing-pages/templates/book-sections.tsx`

- [ ] **Step 1: Read** `apps/web/src/components/public/book-preview-modal.tsx` (its props) and `apps/web/src/lib/format.ts` (`toBengali`).

- [ ] **Step 2: Create the module** — `'use client'`, presentational components used by all templates:

```tsx
'use client';

import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { BookPreviewModal } from '@/components/public/book-preview-modal';
import { fixImageUrl } from '@/lib/image-url';
import { toBengali } from '@/lib/format';
import type {
  Product,
  BookSpecsSection as BookSpecsSectionT,
  TocSection as TocSectionT,
  AuthorBioSection as AuthorBioSectionT,
} from '@kamiab/types';

const SPEC_ROWS: { key: keyof Product; label: string; bengali?: boolean }[] = [
  { key: 'author', label: 'লেখক' },
  { key: 'publisher', label: 'প্রকাশনী' },
  { key: 'translator', label: 'অনুবাদক' },
  { key: 'pages', label: 'পৃষ্ঠা', bengali: true },
  { key: 'language', label: 'ভাষা' },
  { key: 'binding', label: 'বাঁধাই' },
  { key: 'edition', label: 'সংস্করণ' },
  { key: 'isbn', label: 'ISBN' },
  { key: 'publicationYear', label: 'প্রকাশকাল', bengali: true },
];

export function BookSpecsSection({ section, product, primary }: { section: BookSpecsSectionT; product: Product; primary: string }) {
  const rows = SPEC_ROWS
    .map((r) => ({ label: r.label, value: product[r.key], bengali: r.bengali }))
    .filter((r) => r.value !== undefined && r.value !== null && r.value !== '');
  if (rows.length === 0) return null;
  return (
    <div className="rounded-2xl overflow-hidden shadow-md">
      <div className="px-6 py-4" style={{ backgroundColor: primary }}>
        <h2 className="text-lg font-bold text-white">{section.title || 'বই পরিচিতি'}</h2>
      </div>
      <table className="w-full bg-white text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-gray-100 last:border-0">
              <td className="px-5 py-3 font-medium text-gray-600 w-1/3">{r.label}</td>
              <td className="px-5 py-3 text-gray-900">
                {r.bengali ? toBengali(Number(r.value)) : String(r.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TocSection({ section, primary }: { section: TocSectionT; primary: string }) {
  if (!section.items?.length) return null;
  return (
    <div className="rounded-2xl bg-white p-5 shadow-md border border-gray-100">
      <h2 className="text-lg font-bold text-gray-900 mb-4">{section.title || 'সূচিপত্র'}</h2>
      <ol className="space-y-2">
        {section.items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
            <span
              className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: primary }}
            >
              {toBengali(i + 1)}
            </span>
            <span className="leading-relaxed pt-0.5">{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function AuthorBioSection({ section, primary }: { section: AuthorBioSectionT; primary: string }) {
  if (!section.name && !section.bio) return null;
  return (
    <div className="rounded-2xl bg-white p-5 shadow-md border border-gray-100 flex gap-4 items-start">
      {section.image?.url && (
        <img src={fixImageUrl(section.image.url)} alt={section.name} className="w-20 h-20 rounded-full object-cover shrink-0" />
      )}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: primary }}>লেখক পরিচিতি</p>
        <h3 className="font-bold text-gray-900">{section.name}</h3>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed whitespace-pre-line">{section.bio}</p>
      </div>
    </div>
  );
}

export function PreviewSection({ product, primary, title }: { product: Product; primary: string; title?: string }) {
  const [open, setOpen] = useState(false);
  const hasPreview = (product.previewImages?.length ?? 0) > 0 || !!product.previewPdf;
  if (!hasPreview) return null;
  return (
    <div className="rounded-2xl bg-white p-6 shadow-md border border-gray-100 text-center">
      <h2 className="text-lg font-bold text-gray-900 mb-3">{title || 'একটু পড়ে দেখুন'}</h2>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-white"
        style={{ backgroundColor: primary }}
      >
        <BookOpen className="h-5 w-5" />
        একটু পড়ে দেখুন
      </button>
      <BookPreviewModal
        open={open}
        onOpenChange={setOpen}
        images={product.previewImages}
        pdf={product.previewPdf}
        title={product.name}
      />
    </div>
  );
}
```

(If `BookPreviewModal`'s prop names differ, adapt to its actual signature — confirm by reading it in Step 1.)

- [ ] **Step 3: Verify + commit**

Run: `pnpm --filter web type-check`
Expected: PASS.

```bash
git add apps/web/src/features/landing-pages/templates/book-sections.tsx
git commit -m "feat(web): shared book landing-section components"
```

---

### Task D1: Builder — add section editors + brand retarget

**Files:** Modify `apps/web/src/features/landing-pages/landing-page-builder.tsx`

- [ ] **Step 1: Read** the builder: the `SECTION_TYPES` picker array, the add-section `switch` that creates `newSection`, the per-section editor rendering (the big `switch`/map over sections), the default `colors`, and the existing image-upload helper used by image/reviews sections.

- [ ] **Step 2: Add picker entries** to the section-type list:

```ts
  { type: 'book_specs', label: 'বই পরিচিতি (অটো)' },
  { type: 'toc', label: 'সূচিপত্র' },
  { type: 'author_bio', label: 'লেখক পরিচিতি' },
  { type: 'preview', label: 'একটু পড়ে দেখুন' },
```

- [ ] **Step 3: Add `newSection` defaults** in the add switch:

```ts
      case 'book_specs': newSection = { type: 'book_specs', title: 'বই পরিচিতি' }; break;
      case 'toc': newSection = { type: 'toc', title: 'সূচিপত্র', items: [''] }; break;
      case 'author_bio': newSection = { type: 'author_bio', name: '', bio: '', image: null }; break;
      case 'preview': newSection = { type: 'preview', title: 'একটু পড়ে দেখুন' }; break;
```

- [ ] **Step 4: Add editor UIs** in the section-editor switch, following the existing editors' visual style:
  - `book_specs`: a title `Input` bound to `section.title`, plus a muted note "লিঙ্ক করা বইয়ের তথ্য স্বয়ংক্রিয়ভাবে দেখানো হবে।"
  - `toc`: a title `Input`, then map `section.items` to rows of `Input` (each updates that index) with a remove button per row and an "+ আইটেম যোগ করুন" button (mirror the features/why_product list editors).
  - `author_bio`: `name` `Input`, `bio` `Textarea`, and a single image upload (reuse the builder's image-upload helper → set `section.image = {url, publicId, alt:''}`; remove sets it to `null`).
  - `preview`: a title `Input` + a muted note "লিঙ্ক করা বইয়ের প্রিভিউ (ছবি/পিডিএফ) দেখানো হবে।"

- [ ] **Step 5: Brand retarget** in this file:
  - Default content colors: `primary: '#8dc53d'`, `accent: '#0065b3'` (keep `background: '#fefcf7'`).
  - The `TEMPLATES` swatch colors and any other `#4a7c2e`/`#d97706` here → `#8dc53d`/`#0065b3`.
  - The why_product picker label "কেন খাবেন আমাদের পণ্য?" → "কেন পড়বেন এই বইটি?".

- [ ] **Step 6: Verify + commit**

Run: `pnpm --filter web type-check && pnpm --filter web build`
Expected: PASS.

```bash
git add apps/web/src/features/landing-pages/landing-page-builder.tsx
git commit -m "feat(web): book section editors + brand colors in landing builder"
```

---

### Task D2: Templates — render new sections + brand retarget

**Files:** Modify `apps/web/src/features/landing-pages/templates/template1.tsx`, `template2.tsx`, `template3.tsx`, `template4.tsx`

For EACH of the four templates:

- [ ] **Step 1: Read** the template's `SectionRenderer` and its `default export` (how it maps `content.sections` and what it passes to `SectionRenderer`, and its `primary`/`accent`/`bg` fallback constants).

- [ ] **Step 2: Pass `product` into `SectionRenderer`.** Add a `product: Product` param to the `SectionRenderer` prop type and pass `product` at the call site in the sections map.

- [ ] **Step 3: Add the four cases** to the `SectionRenderer` `switch`, importing the shared components:

```tsx
import { BookSpecsSection, TocSection, AuthorBioSection, PreviewSection } from './book-sections';
```

```tsx
    case 'book_specs':
      return <BookSpecsSection section={section} product={product} primary={primary} />;
    case 'toc':
      return <TocSection section={section} primary={primary} />;
    case 'author_bio':
      return <AuthorBioSection section={section} primary={primary} />;
    case 'preview':
      return <PreviewSection product={product} primary={primary} title={section.title} />;
```

- [ ] **Step 4: Brand + copy retarget** in the template:
  - Fallback color constants `'#4a7c2e'` → `'#8dc53d'`, `'#d97706'` → `'#0065b3'` (and template3's swapped primary/accent defaults accordingly — keep its intended primary=accent-swap logic but with brand colors).
  - Food copy → book copy where obvious: the `why_product` heading (e.g. template1 "কেন খাবেন আমাদের {productName}?") → "কেন পড়বেন এই বইটি?"; any announcement-bar/strip text like "১০০% অর্গানিক" → a book-relevant line (e.g. "📚 অরিজিনাল বই • ক্যাশ অন ডেলিভারি • দ্রুত ডেলিভারি").

- [ ] **Step 5: Verify + commit** (after all four)

Run: `pnpm --filter web type-check && pnpm --filter web build`
Expected: PASS.

```bash
git add apps/web/src/features/landing-pages/templates
git commit -m "feat(web): render book sections + brand colors in all landing templates"
```

---

### Final verification

- [ ] `pnpm -r type-check && pnpm --filter api build && pnpm --filter web build` all PASS.
- [ ] `grep -rn "4a7c2e\|d97706" apps/web/src/features/landing-pages` returns nothing.
- [ ] Spec coverage: types (A1), backend zod (B1), shared components (C1), builder editors+colors (D1), template rendering+colors (D2). No item missing.
- [ ] Manual (if dev DB): build a landing page adding all four sections; the public `/step/[slug]` renders book_specs (from product), toc list, author bio, and the preview button (when the product has a preview); colors are brand green/blue.
