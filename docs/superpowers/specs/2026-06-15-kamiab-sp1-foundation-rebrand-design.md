# SP1 — Foundation & Rebrand (Kamiab Prokashon → Kamiab Prokashon)

**Date:** 2026-06-15
**Status:** Approved design, pending implementation plan

## Background

The codebase is a fully-built MERN e-commerce platform originally for **Kamiab Prokashon**
(organic food). It is being repurposed for **Kamiab Prokashon** — an Islamic book
publisher and seller based in Banglabazar, Dhaka (reference sites: wafilife.com,
rokomari.com).

The full effort is decomposed into four sub-projects, each with its own
spec → plan → implement cycle:

- **SP1 — Foundation & rebrand** (this doc): theme colors, brand constants, logo,
  meta/SEO, global text rebrand.
- **SP2 — Book data model + admin**: extend `Product` (author, publisher, translator,
  pages, ISBN, language, binding, publicationYear, `regularPrice` for MRP/discount,
  `preview` image/PDF), new `Category` model + admin CRUD + menu, new `Banner` model +
  admin (hero slider).
- **SP3 — Public site redesign for books**: header (category menu), footer, home
  (hero slider + bestsellers + new arrivals), shop (category/author/publisher filter +
  sort), book product card (cover + author + MRP/discount badge), book detail page
  (specs table, order→popup with Checkout/Buy-more, "একটু পড়ে দেখুন" preview modal),
  plus contact/privacy/return pages.
- **SP4 — Landing pages for books**: adapt 4 templates + builder, add book-specific
  sections (book specs, সূচিপত্র, author bio, preview), branding/colors.

This document covers **SP1 only**.

## Goals

- Replace all user-facing Kamiab Prokashon branding with Kamiab Prokashon.
- Switch the global theme to the brand colors `#8dc53d` (green) and `#0065b3` (blue).
- Centralize brand info (name, slogan, phone, address, email, socials, site URL) in
  one file so later sub-projects consume it rather than hardcoding.
- Update global meta/SEO and assets.

Foundation only — **no layout restructure**. SP1 unblocks SP2–SP4.

## Non-goals (deferred to later sub-projects)

- Home hero gradient colors, landing template default colors — restyled in SP3/SP4
  where those surfaces are redesigned anyway (avoids double work).
- contact / privacy / return pages — created in SP3.
- Renaming internal code identifiers (`@kamiab/types` package, `kamiab-cart`
  localStorage key, root `package.json` name, repo dir). User chose **user-facing only**;
  these stay to avoid import churn and to preserve existing customer carts.
- Backend `.env` deployment values (CORS_ORIGIN, COOKIE_DOMAIN) — deployment-time concern,
  noted but not changed here.

## Brand facts (source of truth)

| Field | Value |
|---|---|
| Name (EN) | Kamiab Prokashon |
| Name (BN) | কামিয়াব প্রকাশন |
| Slogan (BN) | ইসলামী গ্রন্থ প্রকাশক ও বিক্রেতা |
| Phone | 01750-036787 |
| Address | Bismillah Mansion, 2nd flr, 34 Northbrook Hall Road, Banglabazar, Dhaka 1100 |
| Email | contact@kamiabprokashon.xyz |
| Facebook | https://www.facebook.com/kamiabprokashon |
| Domain / Site URL | https://kamiabprokashon.xyz |
| Primary color | `#8dc53d` (green — brand identity) |
| Secondary color | `#0065b3` (blue — actions/CTA) |

## Design

### 1. Color tokens

Updated in `apps/web/tailwind.config.ts` and the CSS custom properties in
`apps/web/src/app/globals.css` (the `:root` block uses space-separated RGB triplets).

**Contrast strategy (chosen):** `#8dc53d` is a bright green; white text on it fails WCAG.
So green is the **brand identity** color, but:
- Text-bearing green surfaces (buttons, badges) use `primary.dark` (`#6fa32e`) with white text.
- The main action/CTA color is brand **blue `#0065b3`** with white text (strong contrast),
  mapped onto the existing `accent` token.

| Token | Old | New |
|---|---|---|
| `primary.DEFAULT` | `#4a7c2e` | `#8dc53d` |
| `primary.dark` | `#3a6324` | `#6fa32e` |
| `primary.light` | `#6fa14a` | `#aadd6b` |
| `primary.foreground` | `#ffffff` | `#ffffff` (used with `primary.dark` surfaces) |
| `accent.DEFAULT` | `#e85d04` | `#0065b3` |
| `accent.soft` | `#f97316` | `#3a8fd0` |
| `accent.foreground` | `#ffffff` | `#ffffff` |
| `ring` | `#4a7c2e` | `#8dc53d` |
| `sidebar.primary` | `#4a7c2e` | `#8dc53d` |
| `sidebar.ring` | `#4a7c2e` | `#8dc53d` |

`globals.css` `:root` triplets to update accordingly:
- `--primary: 141 197 61;` (#8dc53d)
- `--accent: 0 101 179;` (#0065b3)
- `--ring: 141 197 61;`

`background` (#fefcf7 cream) and greys are kept — neutral, brand-agnostic.

**Note on `primary.DEFAULT` = `#8dc53d` consumed with white text:** any existing component
that renders white text directly on `bg-primary` should, where it is part of SP1's text
sweep, prefer `bg-primary-dark` or the blue accent. A full audit of every `bg-primary`
usage is **not** in SP1 scope (most live on pages redesigned in SP3); the global token
change plus the chrome (header/footer/login/sidebar) is the SP1 deliverable.

### 2. Brand constants file — `apps/web/src/lib/brand.ts`

New module exporting a typed `BRAND` object:

```ts
export const BRAND = {
  nameEn: 'Kamiab Prokashon',
  nameBn: 'কামিয়াব প্রকাশন',
  sloganBn: 'ইসলামী গ্রন্থ প্রকাশক ও বিক্রেতা',
  phone: '01750-036787',
  phoneDisplay: '01750-036787',
  address: 'Bismillah Mansion, 2nd flr, 34 Northbrook Hall Road, Banglabazar, Dhaka 1100',
  email: 'contact@kamiabprokashon.xyz',
  facebook: 'https://www.facebook.com/kamiabprokashon',
  siteUrl: 'https://kamiabprokashon.xyz',
} as const;
```

All chrome (header, footer, login, layout meta) imports from here instead of hardcoding.

### 3. Assets — `apps/web/public/`

- `logo.png`, `logo-white.png` — replaced with user-provided Kamiab Prokashon logos.
  Until provided, existing files remain in place; `alt` text is updated to "Kamiab Prokashon".
- `favicon.ico` — replaced when provided.

### 4. Meta / SEO — `apps/web/src/app/layout.tsx`

- `metadataBase: new URL('https://kamiabprokashon.xyz')`
- `title.default`: `Kamiab Prokashon | ইসলামী গ্রন্থ প্রকাশক ও বিক্রেতা`
- `title.template`: `%s | Kamiab Prokashon`
- `description`: Islamic-book-publisher focused Bengali copy.
- `keywords`: Islamic books / boi / publisher / Banglabazar / Bengali terms.
- `openGraph.siteName`: `Kamiab Prokashon` (locale `bn_BD` kept).
- Font: Hind Siliguri retained (Bengali-first content).

### 5. Text rebrand sweep (file-by-file)

| File | Change |
|---|---|
| `apps/web/src/components/layout/public-header.tsx` | logo `alt` → Kamiab Prokashon |
| `apps/web/src/components/layout/public-footer.tsx` | brand blurb → slogan + Islamic-book copy; phone `01750-036787`; email `contact@kamiabprokashon.xyz`; address (Banglabazar); FB link → kamiabprokashon; logo alt; copyright name. All sourced from `BRAND`. |
| `apps/web/src/app/layout.tsx` | meta (section 4) |
| `apps/web/src/app/admin/login/page.tsx` | `Kamiab Prokashon` → `Kamiab Prokashon` |
| `apps/web/src/components/layout/admin-header.tsx`, `admin-sidebar.tsx` | brand name if shown |
| `apps/web/src/app/admin/settings/page.tsx` | SMS senderId placeholder `SHUKHILIFE` → e.g. `KAMIAB` |
| Admin chart hex `#4a7c2e` (`admin/page.tsx`, `accounts/page.tsx`) | → `#8dc53d` brand green (cosmetic sweep) |

`@kamiab/types` import specifiers are **not** changed (internal, out of scope).

## Affected files (summary)

- `apps/web/tailwind.config.ts`
- `apps/web/src/app/globals.css`
- `apps/web/src/lib/brand.ts` (new)
- `apps/web/src/app/layout.tsx`
- `apps/web/src/components/layout/{public-header,public-footer,admin-header,admin-sidebar}.tsx`
- `apps/web/src/app/admin/login/page.tsx`
- `apps/web/src/app/admin/settings/page.tsx`
- `apps/web/src/app/admin/page.tsx`, `apps/web/src/app/admin/accounts/page.tsx` (chart colors)
- `apps/web/public/{logo.png,logo-white.png,favicon.ico}` (user-provided)

## Verification

- `pnpm -r type-check` passes.
- `pnpm --filter web build` succeeds.
- Manual: home, shop, footer, admin login show Kamiab Prokashon branding; buttons/links
  render in brand green/blue; no leftover "Kamiab Prokashon" user-facing text
  (`grep -rin "shukhi" apps/web/src` returns only internal `@kamiab/types` imports
  and the `kamiab-cart` key).
- Spot-check button contrast: primary/CTA buttons readable (green-dark or blue with white text).

## Open items

- Real logo/favicon files to be supplied by the user; placeholders used until then.
