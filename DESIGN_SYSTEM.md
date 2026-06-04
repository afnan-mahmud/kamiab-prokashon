# Shukhi Life — Design System

> Extracted from live site screenshots (desktop homepage, landing/product page, mobile homepage, mobile product page).  
> Use this as the single source of truth when building components.

---

## 1. Color Palette

### Brand Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--primary` | `#4a7c2e` | Nav links, section headings, primary buttons, checkmark bullets, logo text |
| `--primary-dark` | `#3a6324` | Button hover, active states |
| `--primary-light` | `#6fa14a` | Hover highlights, secondary accents |
| `--accent` | `#e85d04` | CTA buttons ("Order Now"), section title underlines, price text, highlighted bullets |
| `--accent-soft` | `#f97316` | Secondary CTA hover, warm accent |
| `--background` | `#fefcf7` | Page background (cream off-white) |
| `--surface` | `#ffffff` | Cards, header, form areas |
| `--text-primary` | `#1f2937` | Body text, product names |
| `--text-secondary` | `#6b7280` | Subtext, meta info |
| `--border` | `#e5e7eb` | Card borders, input borders, dividers |
| `--success` | `#16a34a` | In-stock badges, success toasts |
| `--danger` | `#dc2626` | Error states, out-of-stock |
| `--warning` | `#f59e0b` | Warning badges |

### Section-Specific Colors (observed from screenshots)

| Element | Value |
|---------|-------|
| Section title text ("বেস্ট সেলিং") | `#e85d04` — orange-red |
| Section title decorative underline | `#e85d04` wavy/solid line, ~2px |
| Hero background | `#fefcf7` (cream), sometimes white |
| Hero left panel | Cream `#fefcf7` |
| Hero right panel frame/border | `#4a7c2e` (green border around featured image) |
| Product price text | `#e85d04` (orange) |
| "Order Now" button bg | `#4a7c2e` (green) |
| Footer background | `#111111` (near black) |
| Footer text | `#ffffff` |
| Footer icon row | Social/payment icons on dark bg |
| Form section bg | `#ffffff` |
| Form submit button | `#4a7c2e` full-width green |

---

## 2. Typography

### Font Stack

```css
font-family: 'Hind Siliguri', 'Noto Sans Bengali', sans-serif;
```

- **Primary:** Hind Siliguri (Google Fonts) — handles both Bengali and Latin
- **Fallback:** Noto Sans Bengali

### Scale

| Role | Size | Weight | Line Height | Usage |
|------|------|--------|-------------|-------|
| `hero-heading` | 28–36px | 700 | 1.3 | Hero section main title |
| `section-title` | 22–24px | 700 | 1.3 | "বেস্ট সেলিং", "আমাদের পণ্যসমূহ" |
| `card-title` | 13–14px | 600 | 1.4 | Product card name |
| `body` | 14–15px | 400 | 1.6 | Descriptions, bullet text |
| `price` | 14–15px | 700 | 1.2 | Price display |
| `button` | 13–14px | 600 | 1 | All button labels |
| `label` | 12–13px | 500 | 1.4 | Form labels, badges |
| `meta` | 12px | 400 | 1.4 | Subtext, timestamps |
| `nav` | 14px | 500 | 1 | Header navigation |

### Bengali Number Convention

- **Customer site:** Bengali digits — ০১২৩৪৫৬৭৮৯ + ৳ symbol → e.g. `১,২০০৳`
- **Admin panel:** English digits → e.g. `1,200৳`

---

## 3. Spacing System

Base unit: **4px**

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Tight internal padding |
| `space-2` | 8px | Icon gaps, tight margins |
| `space-3` | 12px | Input padding vertical |
| `space-4` | 16px | Standard padding, card padding |
| `space-5` | 20px | Section gaps (small) |
| `space-6` | 24px | Card gap, button padding |
| `space-8` | 32px | Section vertical padding |
| `space-10` | 40px | Large section gaps |
| `space-12` | 48px | Section top/bottom padding |
| `space-16` | 64px | Hero section padding |

### Layout

| Token | Value |
|-------|-------|
| Container max-width | `1280px` |
| Container horizontal padding | `16px` (mobile), `32px` (tablet), `48px` (desktop) |
| Product grid columns | `2` (mobile) → `3` (tablet 768px) → `5` (desktop 1280px) |
| Product card gap | `12–16px` |
| Section vertical margin | `40–48px` |

---

## 4. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 4px | Badges, tags |
| `rounded-md` | 6px | Buttons, inputs, small cards |
| `rounded-lg` | 8px | Standard cards |
| `rounded-xl` | 12px | Featured image frames |
| `rounded-2xl` | 16px | Hero panels, large cards |
| `rounded-full` | 9999px | Avatar, pill buttons |

---

## 5. Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow-card` | `0 1px 3px rgba(0,0,0,0.08)` | Product cards |
| `shadow-card-hover` | `0 4px 12px rgba(0,0,0,0.12)` | Card hover state |
| `shadow-modal` | `0 20px 60px rgba(0,0,0,0.20)` | Modals, dropdowns |
| `shadow-header` | `0 2px 8px rgba(0,0,0,0.06)` | Sticky header |

---

## 6. Component Patterns

### 6.1 Header / Navbar

```
[Logo icon + site name]    [Home] [Shop] [Cart]    [Search input] [🔍 orange button]
```

- Background: `#ffffff`, `box-shadow: shadow-header`
- Logo: green leaf SVG + bold Bengali/English text in `--primary`
- Nav links: `--primary` color, underline on hover
- Search bar: border `--border`, orange search button (`--accent`)
- Cart icon: shows item count badge in orange
- **Mobile:** hamburger menu, logo centered, cart icon right

### 6.2 Hero Section

**Two-panel layout (desktop):**
```
[Left panel — cream bg]              [Right panel — product image in green frame]
  Bengali headline (bold, primary)     Featured product photo
  Sub-text                             Green border/card around image
  [CTA button]
```

- Left panel bg: `#fefcf7`
- Right panel: white card with `2–3px solid #4a7c2e` border, `rounded-xl`
- Headline font: 28–36px, weight 700, `--primary`
- CTA: green button (see Button spec)
- **Mobile:** single column, image on top

### 6.3 Section Title

```
বেস্ট সেলিং
───────────  (orange underline, full-width or text-width)
```

- Text: `--accent` (`#e85d04`), 22–24px, weight 700
- Underline: `2px solid --accent`, either text-width or divider style
- Center-aligned on desktop
- Margin bottom: `24px` before grid

### 6.4 Product Card

```
┌─────────────────────────┐
│   [product image]       │  ← object-fit: cover, aspect 1:1 or 4:3
│                         │
├─────────────────────────┤
│ Product Name (Bengali)  │  ← 13–14px, weight 600, text-primary
│ ৳ ১,২০০                │  ← 14px, weight 700, --accent (orange)
│                         │
│  [  Order Now  ▶  ]    │  ← full-width green button
└─────────────────────────┘
```

- Card bg: `#ffffff`
- Border: `1px solid #e5e7eb`
- Border radius: `rounded-lg` (8px)
- Shadow: `shadow-card`, hover → `shadow-card-hover`
- Image area: `rounded-t-lg`, top of card
- Padding: `12px` all around for text area
- Button: `rounded-md`, `--primary` bg, white text, full width
- Hover effect: slight scale `transform: scale(1.02)`, transition 150ms

**Variants when out of stock or has options:**
- Button text: "Select options" instead of "Order Now"
- Grayed out button: `--text-secondary` bg when disabled

### 6.5 Buttons

#### Primary (Green — main CTAs)
```css
background: #4a7c2e;
color: #ffffff;
border-radius: 6px;
padding: 10px 20px;
font-weight: 600;
font-size: 14px;
```
Hover: `background: #3a6324`

#### Accent / CTA (Orange — landing pages, search)
```css
background: #e85d04;
color: #ffffff;
border-radius: 6px;
padding: 10px 20px;
font-weight: 600;
font-size: 14px;
```
Hover: `background: #c14d03`

#### Outline
```css
background: transparent;
border: 1.5px solid #4a7c2e;
color: #4a7c2e;
border-radius: 6px;
padding: 9px 20px;
```

#### Destructive
```css
background: #dc2626;
color: #ffffff;
border-radius: 6px;
```

#### Full-width (landing page order form)
- Same as Primary but `width: 100%`, `padding: 14px 20px`, `font-size: 16px`

### 6.6 Form / Inputs

```
Label (14px, weight 500, text-primary)
┌──────────────────────────────────────┐
│ Placeholder text                     │
└──────────────────────────────────────┘
```

- Border: `1px solid #e5e7eb`
- Border radius: `6px`
- Padding: `10px 14px`
- Focus border: `1.5px solid #4a7c2e`
- Focus ring: `0 0 0 3px rgba(74,124,46,0.15)`
- Error border: `1.5px solid #dc2626`
- Background: `#ffffff`
- Font: 14px, `--text-primary`

**Select / Dropdown:**  
Same styling as input, custom chevron icon in `--text-secondary`

**Radio group (delivery location):**
- Displayed as two labeled boxes side by side
- Selected: green border + soft green bg `rgba(74,124,46,0.08)`
- Unselected: `--border` border, white bg

### 6.7 Landing Page Layout

Observed in `screencapture-shukhilife-step-muri` screenshot:

**Sections in order:**
1. **Hero** — Two column: left (headline + desc + CTA button), right (product image)
2. **"কেন খাবেন?"** — Heading + bullet list with green `✓` checkmarks
3. **"আমাদের থেকে কেন নিবেন?"** — Two column: left image, right benefit list with orange bullets
4. **Order Form section** — Full-width, cream bg, bold headline + phone number as trust signal, then 2-column form grid
5. **Footer** — Same as main site

**Order Form details:**
- Section bg: `#fefcf7` (cream)
- Headline: Bengali, bold, `--text-primary`
- Phone display: large bold orange text (trust/urgency)
- Form grid: 2 columns on desktop, 1 column mobile
- Fields: Variant selector, Quantity, Name, Phone, Address, District, Area
- Delivery radio: "ঢাকার ভেতরে — ৬০৳" / "ঢাকার বাইরে — ১২০৳"
- Submit: full-width green button "অর্ডার কনফার্ম করুন"

### 6.8 Footer

Three-column dark footer:

```
[Contact Us]          [Quick Link]          [Payment Option]
Address               Privacy Policy        [Visa][MC][bKash]...
Phone numbers         Return Policy
Email                 Contact Us

[Social icons row]                          Powered by: ...
```

- Background: `#111111`
- Text: `#ffffff` (headings bold, body regular)
- Column heading: white, 15px, weight 700, underline accent
- Links: `#cccccc`, hover `#ffffff`
- Divider: `1px solid #333333`
- Payment icons: standard brand logos, `height: 24px`
- Social icons: circular or plain, white fill

### 6.9 Badges / Status Chips

| Status | Background | Text Color |
|--------|-----------|-----------|
| Pending | `#fef3c7` | `#92400e` |
| Confirmed | `#d1fae5` | `#065f46` |
| Hand over to Courier | `#dbeafe` | `#1e40af` |
| Cancelled | `#fee2e2` | `#991b1b` |
| Call not received | `#f3f4f6` | `#374151` |
| Fake order | `#fce7f3` | `#9d174d` |
| Delivered | `#d1fae5` | `#065f46` |

- Border radius: `rounded-full` (pill shape)
- Padding: `2px 10px`
- Font: 12px, weight 500

---

## 7. Grid System

### Product Grid

| Breakpoint | Columns | Gap |
|-----------|---------|-----|
| < 480px (mobile) | 2 | 8px |
| 480–767px | 2–3 | 10px |
| 768–1023px (tablet) | 3 | 12px |
| 1024–1279px | 4 | 14px |
| ≥ 1280px (desktop) | 5 | 16px |

### Admin Panel Grid

| Breakpoint | Columns |
|-----------|---------|
| Mobile | 1 |
| Tablet | 2 |
| Desktop | 3–4 (stat cards), 1 (table) |

---

## 8. Iconography

- **Library:** Lucide React (consistent line icons)
- **Size defaults:** 16px (inline), 20px (button icons), 24px (nav icons)
- **Color:** inherits from parent text color
- **Stroke width:** 1.5–2px

---

## 9. Mobile-Specific Patterns

Observed from mobile screenshots:

- **Header:** Logo centered, hamburger left, cart right
- **Product cards:** 2-column grid, image top-heavy, tight padding (8px)
- **Section titles:** slightly smaller (18–20px)
- **Buttons:** full-width or near full-width on mobile
- **Product name text:** wraps to 2 lines max (overflow: hidden, line-clamp: 2)
- **Hero:** single column, image stacks above text
- **Touch targets:** minimum 44×44px for all interactive elements
- **Sticky CTA:** "Order Now" sticky bar at bottom on product/landing pages

---

## 10. Admin Panel Design (Separate from Customer Site)

Admin uses same color tokens but with an English-first, data-dense layout:

- **Sidebar:** `#1f2937` (dark gray) bg, white text, active item has `--primary` left border + soft green bg
- **Topbar:** white bg, breadcrumb left, user avatar + name right
- **Stat cards:** white bg, `shadow-card`, icon in soft green circle, number in `--text-primary` 36px bold
- **Tables:** white bg, `--border` row dividers, sortable headers in `--text-secondary`
- **Action buttons in tables:** icon buttons (edit=blue, delete=red, courier=green)
- **English digits** throughout admin
- **Chart colors:**
  - Revenue line: `#4a7c2e`
  - Orders bars: `#6fa14a`
  - Donut slices: `#4a7c2e`, `#d97706`, `#3b82f6`, `#dc2626`, `#8b5cf6`, `#6b7280`

---

## 11. Animation & Transitions

| Element | Property | Duration | Easing |
|---------|----------|----------|--------|
| Buttons | `background-color` | 150ms | `ease-in-out` |
| Cards | `transform`, `box-shadow` | 150ms | `ease-in-out` |
| Sidebar | `transform` (mobile slide) | 200ms | `ease-out` |
| Modal | `opacity`, `transform` | 200ms | `ease-out` |
| Toast | `transform`, `opacity` | 300ms | `spring` |
| Page transitions | `opacity` | 200ms | `ease-in-out` |

---

## 12. Tailwind Config Reference

```ts
// tailwind.config.ts
extend: {
  colors: {
    primary: {
      DEFAULT: '#4a7c2e',
      dark:    '#3a6324',
      light:   '#6fa14a',
    },
    accent: {
      DEFAULT: '#e85d04',
      soft:    '#f97316',
    },
    background: '#fefcf7',
    surface:    '#ffffff',
  },
  fontFamily: {
    bengali: ['Hind Siliguri', 'Noto Sans Bengali', 'sans-serif'],
  },
  maxWidth: {
    container: '1280px',
  },
  borderRadius: {
    sm:   '4px',
    md:   '6px',
    lg:   '8px',
    xl:   '12px',
    '2xl': '16px',
  },
  boxShadow: {
    card:       '0 1px 3px rgba(0,0,0,0.08)',
    'card-hover': '0 4px 12px rgba(0,0,0,0.12)',
    modal:      '0 20px 60px rgba(0,0,0,0.20)',
    header:     '0 2px 8px rgba(0,0,0,0.06)',
  },
}
```

---

## 13. Key Decisions (from screenshots)

1. **Product image ratio:** Square (1:1) for grid cards. Slightly wider (4:3) on product detail.
2. **Price always in accent orange** on public site — stands out against white/cream.
3. **Section titles use orange, NOT green** — green is reserved for buttons/interactive elements.
4. **Green CTA buttons everywhere** — "Order Now", "অর্ডার কনফার্ম করুন", "অর্ডার করুন".
5. **No customer account flow visible** — checkout is phone-number first, no login UI on public site.
6. **Landing page order form is 2-column grid** on desktop, collapses to 1 on mobile.
7. **Footer is very dark** (near black, not dark green) — strong contrast against cream page bg.
8. **Benefit bullets:** green checkmarks (`✓`) for product benefits, orange dots for "why us" section.
9. **Delivery charge shown inline in radio** — e.g. "ঢাকার ভেতরে ৬০৳ | ঢাকার বাইরে ১২০৳".
10. **Trust signal on landing page:** Display phone number prominently above order form.
