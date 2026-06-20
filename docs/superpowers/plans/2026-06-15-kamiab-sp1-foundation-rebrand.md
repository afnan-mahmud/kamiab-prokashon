# Kamiab Prokashon — SP1 Foundation & Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all user-facing Kamiab Prokashon branding with Kamiab Prokashon and switch the global theme to brand colors `#8dc53d` (green) / `#0065b3` (blue).

**Architecture:** Foundation-only rebrand — no layout restructure. A single `BRAND` constants module becomes the source of truth for name/slogan/contact/socials; Tailwind + CSS-variable color tokens are remapped; chrome (header, footer, login, sidebar, meta) is updated to consume the constants. Home hero, landing templates, and missing static pages are intentionally deferred to SP3/SP4.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui.

**Spec:** `docs/superpowers/specs/2026-06-15-kamiab-sp1-foundation-rebrand-design.md`

**Verification note:** This sub-project changes config/text/theme, not logic — so tasks verify via `grep`, `pnpm --filter web type-check`, and `pnpm --filter web build` rather than unit tests. Run all commands from the repo root `/Users/afnanmahmud/Documents/kamiab-prokason`.

---

### Task 1: Brand constants module

**Files:**
- Create: `apps/web/src/lib/brand.ts`

- [ ] **Step 1: Create the brand constants file**

```ts
// apps/web/src/lib/brand.ts
// Single source of truth for Kamiab Prokashon brand info.
// Consumed by chrome (header, footer, login, sidebar) and layout metadata.

export const BRAND = {
  nameEn: 'Kamiab Prokashon',
  nameBn: 'কামিয়াব প্রকাশন',
  sloganBn: 'ইসলামী গ্রন্থ প্রকাশক ও বিক্রেতা',
  phone: '01750-036787',
  email: 'contact@kamiabprokashon.xyz',
  address: 'Bismillah Mansion, 2nd flr, 34 Northbrook Hall Road, Banglabazar, Dhaka 1100',
  facebook: 'https://www.facebook.com/kamiabprokashon',
  siteUrl: 'https://kamiabprokashon.xyz',
} as const;
```

- [ ] **Step 2: Verify it type-checks**

Run: `pnpm --filter web type-check`
Expected: PASS (no errors).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/brand.ts
git commit -m "feat(brand): add Kamiab Prokashon brand constants module"
```

---

### Task 2: Color tokens (Tailwind config)

**Files:**
- Modify: `apps/web/tailwind.config.ts:14-70`

- [ ] **Step 1: Update the `primary` color block**

Replace the `primary` object (lines ~15-20) with:

```ts
        primary: {
          DEFAULT: '#8dc53d',
          dark: '#6fa32e',
          light: '#aadd6b',
          foreground: '#ffffff',
        },
```

- [ ] **Step 2: Update the `accent` color block to brand blue**

Replace the `accent` object (lines ~21-25) with:

```ts
        accent: {
          DEFAULT: '#0065b3',
          soft: '#3a8fd0',
          foreground: '#ffffff',
        },
```

- [ ] **Step 3: Update `ring` and the `sidebar` brand tokens**

Set the top-level `ring` value to `'#8dc53d'`. In the `sidebar` object set `primary: '#8dc53d'` and `ring: '#8dc53d'` (leave the dark `DEFAULT`, `foreground`, `accent`, `border` greys unchanged).

- [ ] **Step 4: Verify build picks up the theme**

Run: `pnpm --filter web build`
Expected: PASS (build completes; Tailwind compiles).

- [ ] **Step 5: Commit**

```bash
git add apps/web/tailwind.config.ts
git commit -m "feat(theme): remap Tailwind primary/accent to brand green & blue"
```

---

### Task 3: Color tokens (CSS variables)

**Files:**
- Modify: `apps/web/src/app/globals.css:13-25`

- [ ] **Step 1: Update the brand CSS custom properties**

In the `:root` block, change these three lines (values are space-separated RGB triplets):

```css
    --primary: 141 197 61;
    --accent: 0 101 179;
    --ring: 141 197 61;
```

Leave `--primary-foreground: 255 255 255;` and `--accent-foreground: 255 255 255;` as-is. Do not change `--background`, greys, or `--destructive`.

- [ ] **Step 2: Verify build**

Run: `pnpm --filter web build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "feat(theme): update CSS variable tokens to brand colors"
```

---

### Task 4: Global metadata / SEO

**Files:**
- Modify: `apps/web/src/app/layout.tsx:17-30`

- [ ] **Step 1: Replace the `metadata` export**

```tsx
export const metadata: Metadata = {
  metadataBase: new URL('https://kamiabprokashon.xyz'),
  title: {
    default: 'Kamiab Prokashon | ইসলামী গ্রন্থ প্রকাশক ও বিক্রেতা',
    template: '%s | Kamiab Prokashon',
  },
  description:
    'কামিয়াব প্রকাশন — ইসলামী গ্রন্থ প্রকাশক ও বিক্রেতা। তাফসীর, হাদিস, ফিকহ, সীরাত ও মানসম্পন্ন ইসলামী বইয়ের নির্ভরযোগ্য ঠিকানা। সারা বাংলাদেশে দ্রুত ডেলিভারি।',
  keywords: ['ইসলামী বই', 'বই', 'কামিয়াব প্রকাশন', 'Kamiab Prokashon', 'Islamic books', 'তাফসীর', 'হাদিস', 'বাংলাবাজার', 'বাংলাদেশ'],
  openGraph: {
    siteName: 'Kamiab Prokashon',
    locale: 'bn_BD',
    type: 'website',
  },
};
```

- [ ] **Step 2: Verify type-check and build**

Run: `pnpm --filter web type-check && pnpm --filter web build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/layout.tsx
git commit -m "feat(seo): rebrand global metadata to Kamiab Prokashon"
```

---

### Task 5: Public footer rebrand

**Files:**
- Modify: `apps/web/src/components/layout/public-footer.tsx`

- [ ] **Step 1: Import the brand constants**

At the top of the file, after the existing imports, add:

```tsx
import { BRAND } from '@/lib/brand';
```

- [ ] **Step 2: Update logo alt and brand blurb**

Change the brand `<Image>` `alt="Kamiab Prokashon"` to `alt={BRAND.nameEn}`. Replace the blurb paragraph text with:

```tsx
            <p className="text-sm leading-relaxed text-gray-400">
              {BRAND.sloganBn} — তাফসীর, হাদিস, ফিকহ, সীরাত ও মানসম্পন্ন ইসলামী বইয়ের নির্ভরযোগ্য প্রকাশক ও বিক্রেতা।
            </p>
```

- [ ] **Step 3: Update contact block (phone, email, address)**

Replace the three contact `<li>` values:

```tsx
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary-light" />
                <span>{BRAND.phone}</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary-light" />
                <span>{BRAND.email}</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary-light" />
                <span>{BRAND.address}</span>
              </li>
```

- [ ] **Step 4: Update Facebook link and copyright**

Set the Facebook `<a href>` to `{BRAND.facebook}`. Change the copyright line `Kamiab Prokashon` to `{BRAND.nameEn}`:

```tsx
            <span>© {new Date().getFullYear()} {BRAND.nameEn} — All rights reserved.</span>
```

Leave the "Developed by Cholo Bohudur" credit unchanged.

- [ ] **Step 5: Verify no Shukhi text remains in footer + build**

Run: `grep -in "shukhi" apps/web/src/components/layout/public-footer.tsx; pnpm --filter web build`
Expected: grep returns nothing; build PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/layout/public-footer.tsx
git commit -m "feat(footer): rebrand to Kamiab Prokashon via BRAND constants"
```

---

### Task 6: Public header rebrand

**Files:**
- Modify: `apps/web/src/components/layout/public-header.tsx:26-28`

- [ ] **Step 1: Add the brand import**

After the existing imports add:

```tsx
import { BRAND } from '@/lib/brand';
```

- [ ] **Step 2: Update the logo alt text**

Change `alt="Kamiab Prokashon"` on the logo `<Image>` to `alt={BRAND.nameEn}`.

- [ ] **Step 3: Verify + commit**

Run: `grep -in "shukhi" apps/web/src/components/layout/public-header.tsx`
Expected: nothing.

```bash
git add apps/web/src/components/layout/public-header.tsx
git commit -m "feat(header): rebrand logo alt to Kamiab Prokashon"
```

---

### Task 7: Admin login rebrand

**Files:**
- Modify: `apps/web/src/app/admin/login/page.tsx:65`

- [ ] **Step 1: Add brand import**

After the existing imports add:

```tsx
import { BRAND } from '@/lib/brand';
```

- [ ] **Step 2: Replace the brand name heading**

Change line 65 from `<h1 className="text-xl font-bold text-foreground">Kamiab Prokashon</h1>` to:

```tsx
          <h1 className="text-xl font-bold text-foreground">{BRAND.nameEn}</h1>
```

- [ ] **Step 3: Verify + commit**

Run: `grep -in "shukhi" apps/web/src/app/admin/login/page.tsx`
Expected: nothing.

```bash
git add apps/web/src/app/admin/login/page.tsx
git commit -m "feat(admin): rebrand login screen to Kamiab Prokashon"
```

---

### Task 8: Admin sidebar rebrand

**Files:**
- Modify: `apps/web/src/components/layout/admin-sidebar.tsx:22,79-81,118`

- [ ] **Step 1: Add brand import**

After the `cn` import (line 20) add:

```tsx
import { BRAND } from '@/lib/brand';
```

(Keep the existing `import type { Permission } from '@kamiab/types';` line — internal, do not change.)

- [ ] **Step 2: Update logo badge and brand name**

Replace the logo badge initials `CB` and the brand name span (lines ~78-81):

```tsx
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-white">KP</span>
            </div>
            <span className="text-sm font-semibold text-sidebar-foreground">{BRAND.nameEn}</span>
```

- [ ] **Step 3: Update the sidebar footer label**

Replace line ~118:

```tsx
          <p className="text-xs text-sidebar-foreground/40">{BRAND.nameEn} Admin</p>
```

- [ ] **Step 4: Verify + commit**

Run: `grep -in "shukhi" apps/web/src/components/layout/admin-sidebar.tsx`
Expected: only the `@kamiab/types` import line.

```bash
git add apps/web/src/components/layout/admin-sidebar.tsx
git commit -m "feat(admin): rebrand sidebar to Kamiab Prokashon"
```

---

### Task 9: SMS sender ID placeholder

**Files:**
- Modify: `apps/web/src/app/admin/settings/page.tsx:138`

- [ ] **Step 1: Update the placeholder**

Change the senderId input placeholder from `e.g. SHUKHILIFE` to `e.g. KAMIAB`:

```tsx
                <Input {...form.register('senderId')} className="mt-1" placeholder="e.g. KAMIAB" />
```

- [ ] **Step 2: Verify + commit**

Run: `grep -in "shukhilife" apps/web/src/app/admin/settings/page.tsx`
Expected: nothing.

```bash
git add apps/web/src/app/admin/settings/page.tsx
git commit -m "chore(admin): update SMS sender ID placeholder"
```

---

### Task 10: Admin chart brand colors

**Files:**
- Modify: `apps/web/src/app/admin/page.tsx:28,142,164`
- Modify: `apps/web/src/app/admin/accounts/page.tsx:33,322`

- [ ] **Step 1: Replace green hex in dashboard charts**

In `apps/web/src/app/admin/page.tsx`, replace every occurrence of `#4a7c2e` with `#8dc53d` (the `PIE_COLORS` array entry, the revenue `<Line stroke>`, and the `<Bar fill>`). Replace the orange `#d97706` occurrences with the brand blue `#0065b3` (orders line + sold bar) for consistency.

- [ ] **Step 2: Replace green hex in accounts charts**

In `apps/web/src/app/admin/accounts/page.tsx`, replace `#4a7c2e` with `#8dc53d` (PIE_COLORS + income `<Line stroke>`), and `#d97706` with `#0065b3` (expense `<Bar fill>`).

- [ ] **Step 3: Verify no old brand-green hex remains in these two files + build**

Run: `grep -in "4a7c2e\|d97706" apps/web/src/app/admin/page.tsx apps/web/src/app/admin/accounts/page.tsx; pnpm --filter web build`
Expected: grep returns nothing; build PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/admin/page.tsx apps/web/src/app/admin/accounts/page.tsx
git commit -m "feat(admin): recolor dashboard & accounts charts to brand palette"
```

---

### Task 11: Final verification sweep

**Files:** none (verification only)

- [ ] **Step 1: Confirm no user-facing Shukhi text remains**

Run: `grep -rin "shukhi" apps/web/src`
Expected: only internal occurrences — `@kamiab/types` import specifiers and the `kamiab-cart` localStorage key in `apps/web/src/stores/cart.store.ts`. No display strings.

- [ ] **Step 2: Confirm old brand-green hex is gone from chrome**

Run: `grep -rin "4a7c2e" apps/web/src apps/web/tailwind.config.ts`
Expected: nothing (home hero gradient in `app/page.tsx` uses `#2d5a1b/#4a7c2e/#6fa14a` and is **deferred to SP3** — if it still appears there, that is expected and acceptable).

- [ ] **Step 3: Full type-check and build**

Run: `pnpm --filter web type-check && pnpm --filter web build`
Expected: both PASS.

- [ ] **Step 4: Manual smoke check**

Start dev (`pnpm --filter web dev`), then confirm:
- Footer shows Kamiab Prokashon name, slogan, `01750-036787`, `contact@kamiabprokashon.xyz`, Banglabazar address, FB link.
- Header/admin login/admin sidebar show Kamiab Prokashon.
- Buttons, links, and active states render in brand green; rings/focus are green.
- Admin dashboard charts use green/blue.

- [ ] **Step 5: Commit (if any cleanup was needed)**

```bash
git add -A
git commit -m "chore(rebrand): final SP1 verification cleanup" || echo "nothing to commit"
```
