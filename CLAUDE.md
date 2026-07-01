# Kamiab Prokashon - Full Stack E-commerce Platform

## Project Overview

Migrate Kamiab Prokashon (https://kamiabprokashon.xyz/) from WordPress/WooCommerce to a custom MERN stack solution with a comprehensive admin panel, landing page builder, and integrated courier + SMS systems.

**Business Context:** Bangladesh-based organic food e-commerce store (rice, honey, spices, sweets, etc.) primarily serving Bengali-speaking customers. Orders are mostly Cash on Delivery (COD) with Steadfast as the delivery partner. Most product listings, UI text, and customer communication happen in Bengali.

---

## Tech Stack

### Frontend (Customer Site + Admin Panel)
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **State Management:** Zustand (cart, auth) + TanStack Query (server state)
- **Forms:** React Hook Form + Zod validation
- **Bengali Font:** Hind Siliguri (Google Fonts) — primary; Noto Sans Bengali fallback
- **Icons:** Lucide React
- **Charts (admin dashboard):** Recharts
- **Date handling:** date-fns
- **Notifications:** sonner (toast)

### Backend
- **Framework:** Express.js + TypeScript
- **Database:** MongoDB Atlas (Mongoose ODM)
- **Authentication:** JWT (access + refresh tokens) with httpOnly cookies
- **File Upload:** Multer + Cloudinary (product images, landing page assets)
- **Validation:** Zod
- **Logging:** Winston / Pino
- **Security:** Helmet, CORS, rate-limit, bcrypt
- **Process Manager (deployment):** PM2

### Third-Party Integrations
- **Courier:** Steadfast Courier API (https://docs.steadfast.com.bd/)
- **SMS:** BulkSMSBD API (built but feature-flagged OFF for v1; clean toggle for v2)
- **Payment:** bKash & Card (manual entry in admin panel for v1; gateway integration in v2)

### Repository Structure (Monorepo)

```
kamiab-prokashon/
├── apps/
│   ├── web/                  # Next.js — public site + admin panel
│   └── api/                  # Express backend
├── packages/
│   ├── types/                # Shared TS types (Order, Product, etc.)
│   └── config/               # Shared eslint, tsconfig
├── CLAUDE.md                 # This file
├── README.md
├── package.json              # Root workspace
└── pnpm-workspace.yaml
```

Use **pnpm workspaces**. Single deployment target: VPS with Nginx reverse proxy + PM2.

---

## Design System

### Colors (extracted from kamiabprokashon.xyz — verify with screenshots)
```css
--primary: #4a7c2e;        /* organic green */
--primary-dark: #3a6324;
--primary-light: #6fa14a;
--accent: #d97706;         /* warm orange (CTA buttons) */
--background: #fefcf7;     /* off-white cream */
--surface: #ffffff;
--text-primary: #1f2937;
--text-secondary: #6b7280;
--border: #e5e7eb;
--success: #16a34a;
--danger: #dc2626;
--warning: #f59e0b;
```

### Typography
- **Headings:** Hind Siliguri 600/700
- **Body:** Hind Siliguri 400
- **English numerals:** keep Bengali digits (০১২৩...) for prices on customer site, English digits in admin panel

### Spacing & Radius
- Container max-width: 1280px
- Border radius: `rounded-md` (6px) standard, `rounded-2xl` for cards
- Shadow: `shadow-sm` for cards, `shadow-lg` for modals

### Component Conventions
- All admin panel pages use a shared `<AdminLayout>` with sidebar nav
- All customer pages use `<PublicLayout>` with header/footer
- Buttons: shadcn `<Button>` with variants `default | outline | ghost | destructive`
- Forms: always React Hook Form + Zod schema co-located in `schemas/` folder
- Currency: always show as `১,২০০৳` format (Bengali digits + ৳ symbol) on public site

---

## Database Schema (MongoDB / Mongoose)

### Collections

#### `users` — Admin panel users
```ts
{
  _id, name, email (unique), password (bcrypt),
  role: ObjectId (ref Role),
  isActive: boolean,
  lastLogin: Date,
  createdAt, updatedAt
}
```

#### `roles`
```ts
{
  _id, name (e.g., "Admin", "Manager", "Operator"),
  permissions: string[],   // array of permission keys, see below
  isSystem: boolean,       // true for built-in Admin role (cannot delete)
  createdAt, updatedAt
}
```

**Permission keys** (use these exact strings):
```
dashboard.view
orders.view, orders.create, orders.edit, orders.delete, orders.send_to_courier
customers.view, customers.edit, customers.delete
accounts.view, accounts.income.view, accounts.expense.view, accounts.expense.create
products.view, products.create, products.edit, products.delete
landing.view, landing.create, landing.edit, landing.delete
delivery.view, delivery.edit
stock.view, stock.edit
roles.view, roles.create, roles.edit, roles.delete
users.view, users.create, users.edit, users.delete
settings.view, settings.edit
```

#### `customers`
```ts
{
  _id,
  phone (unique, indexed),     // primary identifier
  name,
  email (optional),
  addresses: [{ label, address, city, area, isDefault }],
  totalOrders: number,         // denormalized counter
  totalSpent: number,          // denormalized lifetime value
  firstOrderAt: Date,
  lastOrderAt: Date,
  notes: string,               // admin notes
  createdAt, updatedAt
}
```
Index on `phone` is critical — checkout auto-fills from this.

#### `products`
```ts
{
  _id, name, slug (unique), description,
  images: [{ url, publicId, alt }],
  category: string,
  variants: [{
    _id, label,                // e.g., "১ কেজি", "২ কেজি", "৫ কেজি"
    price: number,
    stock: number,
    sku: string,
    weight: number,            // in kg, used for delivery charge calculation
    isDefault: boolean
  }],
  isActive: boolean,
  totalSold: number,           // denormalized
  createdAt, updatedAt
}
```

#### `orders`
```ts
{
  _id, orderNumber (e.g., "KP-2026-0001"),
  customer: ObjectId (ref Customer),
  customerSnapshot: { phone, name, address, city, area },  // freeze at order time
  items: [{
    product: ObjectId,
    productName: string,       // snapshot
    variantId: ObjectId,
    variantLabel: string,      // snapshot
    price: number,             // snapshot
    quantity: number,
    weight: number,            // snapshot
    subtotal: number
  }],
  subtotal: number,
  deliveryCharge: number,
  deliveryLocation: "inside_dhaka" | "outside_dhaka",
  discount: number,
  total: number,
  paymentMethod: "cash" | "bkash" | "card" | "steadfast",
  paymentStatus: "pending" | "paid" | "failed",
  status: "Pending" | "Confirmed" | "Cancelled" | "Call not received" | "Fake order" | "Hand over to Courier",
  source: "website" | "landing_page" | "manual",
  landingPage: ObjectId (ref LandingPage, optional),
  
  // Steadfast integration
  courier: {
    consignmentId: string,
    trackingCode: string,
    status: string,            // synced from Steadfast
    lastSyncedAt: Date,
    rawResponse: object        // store full API response for debugging
  },
  
  notes: string,
  createdBy: ObjectId (ref User, null for website orders),
  statusHistory: [{ status, changedBy, changedAt, note }],
  createdAt, updatedAt
}
```

#### `transactions` — accounts ledger (one entry per income/expense event)
```ts
{
  _id,
  type: "income" | "expense",
  category: string,            // "order_cash", "order_bkash", "order_card", "steadfast_payout", "salary", "delivery_fuel", "marketing", etc.
  amount: number,
  date: Date,
  reference: {
    type: "order" | "manual" | "steadfast",
    id: ObjectId               // ref to order or null
  },
  description: string,
  paymentMethod: "cash" | "bkash" | "card" | "bank",
  attachments: [{ url, publicId }],
  createdBy: ObjectId (ref User),
  createdAt, updatedAt
}
```

#### `landingPages`
```ts
{
  _id, name, slug (unique),
  template: "template1" | "template2" | "template3" | "template4",
  product: ObjectId (ref Product),
  selectedVariants: [ObjectId],   // which variants to show in form
  content: {
    heroImage: { url, publicId },
    heroTitle: string,
    heroSubtitle: string,
    sections: [                    // flexible content blocks
      { type: "text", content: string },
      { type: "image", url: string, alt: string },
      { type: "video", embedUrl: string },
      { type: "features", items: [{ icon, title, desc }] },
      { type: "testimonial", items: [...] },
      { type: "faq", items: [{ q, a }] }
    ],
    colors: { primary, accent, background },
    ctaText: string
  },
  isActive: boolean,
  views: number,
  conversions: number,
  createdAt, updatedAt
}
```

#### `deliverySettings` (single document, settings-like)
```ts
{
  _id,
  steadfast: {
    apiKey: string (encrypted),
    secretKey: string (encrypted),
    baseUrl: string,
    isActive: boolean
  },
  charges: {
    insideDhaka: number,        // base charge
    outsideDhaka: number,
    extraPerKg: number,         // additional per kg above base
    baseWeightKg: number        // weight included in base charge
  },
  updatedAt
}
```

#### `smsSettings` (built but flagged off for v1)
```ts
{
  _id,
  bulksmsbd: {
    apiKey: string (encrypted),
    senderId: string,
    isActive: boolean (default false)
  },
  templates: {
    orderConfirmed: string,
    orderShipped: string,
    orderCancelled: string
  },
  updatedAt
}
```

---

## Feature Specifications

### Customer Site (Public)

**Pages:**
1. **Home** — Hero banner, "বেস্ট সেলিং" featured products (8-10), full product grid, footer
2. **Shop** — Product grid with category filter, sort (price asc/desc, newest), pagination
3. **Product detail** — Image gallery, name, variants selector, price (updates on variant change), add-to-cart, description
4. **Cart** — Item list, quantity adjust, subtotal, "Proceed to Checkout"
5. **Checkout** — Form: phone (auto-fills if existing customer), name, address, city, area, delivery location radio (inside/outside Dhaka), order summary with delivery charge, "Confirm Order" button → creates order with status `Pending`
6. **Static pages** — Privacy Policy, Return Policy, Contact Us

**Critical UX:**
- Phone number lookup on checkout: when user types phone and blurs the field, hit `GET /api/customers/lookup?phone=01XXX` → if found, auto-fill name + last used address
- All UI text in Bengali, English fallback for technical terms
- Mobile-first design (most BD traffic is mobile)

---

### Admin Panel

#### 1. Dashboard (`/admin`)
- **Top stat cards:** Total Orders, Total Revenue, Pending Orders, Total Customers
- **Date range selector:** Today | Yesterday | Last 7 days | This Month | Last Month | Custom (date picker)
- **Charts (Recharts):**
  - Revenue line chart over selected range
  - Orders bar chart
  - Top 5 selling products
  - Orders by status (donut)
- **Recent orders table** (last 10)
- All numbers respect the date filter; backend endpoint: `GET /api/admin/dashboard?from=&to=`

#### 2. Orders (`/admin/orders`)
- **Table columns:** Order #, Customer (name + phone), Items count, Total, Payment, Status, Courier Status, Created, Actions
- **Filters:** status, payment method, date range, search by phone/order number
- **Status update:** dropdown in each row — Confirmed, Cancelled, Pending, Call not received, Fake order, Hand over to Courier
- **Send to Courier button:** appears ONLY when status === "Confirmed". Click → POST to Steadfast `/create_order` → on success, save `courier.consignmentId` and `trackingCode`, change order status to "Hand over to Courier"
- **Courier status column:** shows latest synced Steadfast status; refresh icon to manually sync `GET /status_by_cid/:cid`. Background cron syncs every 30 min for active courier orders.
- **New Order button (top right):** opens modal/wizard:
  1. Customer info (phone first → auto-lookup or new)
  2. Add products: searchable dropdown showing all products → pick variant → qty
  3. Delivery location (inside/outside Dhaka) → auto-calculate delivery charge
  4. Payment method: Cash / bKash / Card / Steadfast (COD via courier)
  5. Confirm → creates order with status Confirmed (manual orders are pre-confirmed)
- **Order detail page** (`/admin/orders/:id`): full info, items, status history timeline, courier tracking, edit/cancel actions

#### 3. Customers (`/admin/customers`)
- **Table:** Name, Phone, Total Orders, Total Spent, First Order, Last Order, Actions
- **Search:** by phone or name
- **Customer detail page** (`/admin/customers/:id`):
  - Profile info (editable)
  - Stats: total lifetime spend, total orders, avg order value
  - **Order history table** with all orders + product breakdown
  - Notes field for admin remarks

**Auto-creation logic (CRITICAL):**
- When website order is placed: if `customer.phone` doesn't exist → create new customer record. If exists → update `lastOrderAt`, increment `totalOrders`, add to `totalSpent`.
- Use Mongoose `findOneAndUpdate` with `upsert: true` for atomicity.

#### 4. Accounts (`/admin/accounts`)
Three tabs:

**Tab 1: Summary**
- Total Income, Total Expense, Net Profit (date filtered)
- Income breakdown chart by source (cash/bkash/card/steadfast)
- Expense breakdown chart by category
- Monthly P&L line chart
- Cash in hand calculation (sum of cash income − cash expenses)

**Tab 2: Income**
- Auto-populated from:
  - Orders with payment method cash/bkash/card → instant entry on order confirmation
  - Steadfast payout requests → manual entry from Steadfast `/get_balance` API or manual input
- Table: Date, Source, Order Ref, Method, Amount
- Export to CSV

**Tab 3: Expense**
- Manual entry: Add Expense button → modal with Category, Amount, Date, Description, Payment Method, Optional attachment (receipt photo)
- Categories: Rent, Salary, Marketing, Inventory, Delivery, Utility, Other
- Table with edit/delete

**Ledger:** Combined chronological view of all transactions (income + expense), with running balance — this is the "professional" feature you specified.

**Implementation tip:** Single `transactions` collection handles both income and expense. Tabs are just filters. Aggregation pipelines for summary calculations.

#### 5. Products (`/admin/products`)
- **Grid view** with thumbnail, name, base price, total variants, stock status
- **Add/Edit Product form:**
  - Multiple image upload (drag-drop, Cloudinary)
  - Name, slug (auto-gen from name), description (rich text — Tiptap or similar)
  - Category dropdown
  - **Variants section** — repeater field:
    - Add variant button → row with: Label (e.g., "১ কেজি"), Price, Stock, Weight (kg), SKU
    - Mark one variant as "Default"
    - Reorder variants (drag handle)
  - Active toggle
- Validation: at least 1 variant required, exactly 1 default

#### 6. Landing Page Builder (`/admin/landing-pages`)
- **List view:** all landing pages with views/conversions stats, public URL copy button
- **Create flow (multi-step):**
  1. Choose template (3-4 prebuilt designs — show preview thumbnails)
  2. Select product from product list
  3. Select which variants to expose in the form
  4. **Edit page:** live preview on right, controls on left:
     - Hero image upload
     - Title, subtitle, CTA text
     - Color scheme (primary/accent/bg pickers)
     - Add/remove/reorder content sections (text, image, video, features, testimonial, FAQ)
  5. Confirm → publishes at `/lp/:slug`
- **Public landing page:**
  - Renders template with custom content
  - Bottom checkout form: variant selector → phone → name → address → delivery location radio (charge auto-loads from delivery settings) → "অর্ডার কনফার্ম করুন" button
  - On submit → creates order with `source: "landing_page"` and links to landing page for conversion tracking
  - Track view (increment `views` on page load) and conversion (increment on order)

**Templates:** Build 4 distinct templates as React components — `Template1`, `Template2`, etc. Each accepts the same `content` prop schema. Differ in layout, color use, section order.

#### 7. Delivery Settings (`/admin/delivery`)
- **Steadfast section:**
  - API Key, Secret Key, Base URL inputs
  - Test connection button (calls Steadfast `/get_balance`)
  - Active toggle
  - Encrypt keys at rest (AES-256 with `ENCRYPTION_KEY` env var)
- **Delivery Charges:**
  - Inside Dhaka charge (number input)
  - Outside Dhaka charge
  - Base weight included (kg) — e.g., 1kg
  - Extra per kg above base

**Calculation logic:**
```
totalWeight = sum of (variant.weight × quantity) for all items
extraWeight = max(0, totalWeight − baseWeightKg)
deliveryCharge = (location === 'inside_dhaka' ? insideDhaka : outsideDhaka) + (extraWeight × extraPerKg)
```

#### 8. Roles (`/admin/roles`)
- List view of all roles
- Create/Edit form:
  - Role name
  - Checkbox grid of all permissions (grouped by feature: Orders, Customers, Products, etc.)
  - Save
- "Admin" role is system role (all permissions, cannot edit/delete)
- Cannot delete a role that has assigned users (show warning)

#### 9. Users (`/admin/users`)
- List: name, email, role, last login, active toggle
- Create/Edit form: name, email, password (hidden on edit unless "change password" toggle), role dropdown, active toggle
- Login uses email + password, JWT token, role permissions hydrated on login

---

## Authentication & Authorization

### Login Flow
- `POST /api/auth/login` { email, password } → returns access token (15 min) + refresh token (7 days, httpOnly cookie)
- `POST /api/auth/refresh` → new access token
- `POST /api/auth/logout` → clear cookies

### Authorization Middleware
```ts
// requirePermission('orders.send_to_courier')
function requirePermission(permission: string) {
  return (req, res, next) => {
    const user = req.user;  // attached by JWT middleware
    if (!user.role.permissions.includes(permission)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
```

### Frontend Permission Gating
- Sidebar nav items hidden if user lacks `<feature>.view` permission
- Action buttons disabled/hidden based on permission
- Use a `<Can permission="orders.create">...</Can>` wrapper component

---

## Steadfast Courier Integration

**Base URL:** `https://portal.packzy.com/api/v1`

**Endpoints to wrap:**
- `POST /create_order` — body: `{ invoice, recipient_name, recipient_phone, recipient_address, cod_amount, note }` → returns `{ consignment_id, tracking_code, status }`
- `GET /status_by_cid/:cid` — returns delivery status
- `GET /get_balance` — returns current Steadfast wallet balance (used in Income tab)
- `POST /create_order/bulk-order` — for batch dispatch (future)

**Service module:** `apps/api/src/services/steadfast.service.ts` — encapsulates auth headers (`Api-Key`, `Secret-Key`), error handling, retry logic.

**Cron job:** every 30 minutes, fetch status for orders where `status === 'Hand over to Courier'` and `courier.status` is not in terminal states (`delivered`, `cancelled`, `returned`). Use `node-cron`.

---

## BulkSMSBD SMS Integration (Built but OFF for v1)

**Base URL:** `http://bulksmsbd.net/api/smsapi`

**Service module:** `apps/api/src/services/sms.service.ts`
```ts
async function sendSMS(phone: string, message: string, templateKey: TemplateKey) {
  const settings = await SmsSettings.findOne();
  if (!settings.bulksmsbd.isActive) {
    logger.info(`SMS skipped (disabled): ${templateKey} → ${phone}`);
    return { skipped: true };
  }
  // ... actual send
}
```

**Hook points (call but no-op when disabled):**
- After order created → `sendSMS(phone, template.orderConfirmed, 'orderConfirmed')`
- After "Hand over to Courier" → `sendSMS(phone, template.orderShipped, 'orderShipped')`
- After Cancelled → `sendSMS(phone, template.orderCancelled, 'orderCancelled')`

This way v2 activation is just toggling the active flag in admin.

---

## API Endpoints Reference

```
# Public (customer site)
GET    /api/products                    list active products
GET    /api/products/:slug              single product
GET    /api/customers/lookup?phone=     check if phone exists, return name/address
POST   /api/orders                      create order (customer checkout)
GET    /api/landing/:slug               get landing page content
POST   /api/landing/:slug/order         create order from landing page

# Auth
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me

# Admin (all require auth + permissions)
GET    /api/admin/dashboard?from=&to=
GET    /api/admin/orders
POST   /api/admin/orders                manual order creation
GET    /api/admin/orders/:id
PATCH  /api/admin/orders/:id            update status
POST   /api/admin/orders/:id/courier    send to Steadfast
POST   /api/admin/orders/:id/sync       sync courier status

GET    /api/admin/customers
GET    /api/admin/customers/:id
PATCH  /api/admin/customers/:id
GET    /api/admin/customers/:id/orders

GET    /api/admin/transactions?type=&from=&to=
POST   /api/admin/transactions
PATCH  /api/admin/transactions/:id
DELETE /api/admin/transactions/:id
GET    /api/admin/accounts/summary?from=&to=

GET    /api/admin/products
POST   /api/admin/products
PATCH  /api/admin/products/:id
DELETE /api/admin/products/:id
POST   /api/admin/upload                Cloudinary signed upload

GET    /api/admin/landing-pages
POST   /api/admin/landing-pages
PATCH  /api/admin/landing-pages/:id
DELETE /api/admin/landing-pages/:id

GET    /api/admin/delivery-settings
PATCH  /api/admin/delivery-settings

GET    /api/admin/sms-settings
PATCH  /api/admin/sms-settings

GET    /api/admin/roles
POST   /api/admin/roles
PATCH  /api/admin/roles/:id
DELETE /api/admin/roles/:id

GET    /api/admin/users
POST   /api/admin/users
PATCH  /api/admin/users/:id
DELETE /api/admin/users/:id
```

---

## Build Order (Recommended for Claude Code)

Build in this order — each phase delivers something testable:

### Phase 1: Foundation (Day 1)
1. Initialize monorepo (pnpm workspace, Next.js + Express + shared types package)
2. Setup ESLint, Prettier, TypeScript configs
3. MongoDB Atlas connection, basic Express server with health check
4. Setup shadcn/ui, Tailwind in Next.js with Bengali font
5. Define all Mongoose models (`apps/api/src/models/`)
6. Define shared TS types in `packages/types`

### Phase 2: Auth + Roles (Day 2)
1. Build auth endpoints + JWT middleware
2. Build Roles + Users + Permissions backend
3. Seed default Admin role + first admin user via seed script
4. Login page UI + session management
5. Permission gating component (`<Can>`)

### Phase 3: Admin Layout + Products (Day 3)
1. Admin layout (sidebar + topbar + breadcrumbs)
2. Products CRUD: API + UI with variant repeater + Cloudinary upload
3. Roles management UI
4. Users management UI

### Phase 4: Public Site (Day 4-5)
1. Public layout (header, footer, mobile menu)
2. Home page (hero, featured products, full grid)
3. Shop page with filters and pagination
4. Product detail page (variant selector, add to cart)
5. Cart (Zustand store, persisted to localStorage)
6. Checkout with phone lookup → Customer auto-create

### Phase 5: Orders + Steadfast (Day 6)
1. Orders API (create, list, update status, history)
2. Customer auto-create/update logic on order
3. Orders admin UI with all filters and actions
4. Steadfast service module
5. Send-to-courier flow + status sync cron
6. Manual order creation modal

### Phase 6: Customers + Accounts (Day 7) - Done on Claude
1. Customers list + detail pages
2. Lifetime stats aggregation
3. Transactions (accounts) backend + auto-entry on order
4. Accounts UI: Summary tab with charts, Income tab, Expense tab, Ledger view
5. CSV export

### Phase 7: Dashboard + Landing Pages (Day 8-9)
1. Dashboard aggregations + UI with date filter
2. Landing page templates (4 components)
3. Landing page builder UI (multi-step wizard)
4. Public landing page renderer at `/lp/:slug`
5. View/conversion tracking

### Phase 8: Delivery + SMS + Polish (Day 10)
1. Delivery settings UI + encryption helper
2. SMS service module (feature-flagged)
3. SMS settings UI
4. Mobile responsiveness audit
5. Error boundaries, loading states, empty states
6. Production env config + deployment scripts (PM2 ecosystem file, Nginx config)

---

## Environment Variables

### `.env` (api)
```
NODE_ENV=production
PORT=3091
MONGODB_URI=mongodb+srv://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
ENCRYPTION_KEY=...                 # 32-byte hex for AES-256
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
STEADFAST_BASE_URL=https://portal.packzy.com/api/v1
COOKIE_DOMAIN=.kamiabprokashon.xyz
CORS_ORIGIN=https://kamiabprokashon.xyz,https://admin.kamiabprokashon.xyz
```

### `.env.local` (web)
```
NEXT_PUBLIC_API_URL=https://api.kamiabprokashon.xyz
NEXT_PUBLIC_SITE_URL=https://kamiabprokashon.xyz
```

---

## Coding Conventions

- **No `any`** — use Zod-inferred types or explicit interfaces
- All API responses follow `{ data: T } | { error: { message, code } }` shape
- Use absolute imports with `@/` prefix in both apps
- File naming: kebab-case for files, PascalCase for components
- One feature per folder: `features/orders/{components,hooks,api,schemas}.ts`
- Server actions or React Query mutations — never raw fetch in components
- All money stored as integer (paisa? or just BDT — pick one and stick with it; recommend BDT as integer, no decimals since BDT rarely uses paisa in retail)

---

## Important Notes

- **Bengali-first UI on customer site, English on admin panel** (faster for ops team)
- **No customer accounts on public site** — phone-based identification only, simpler UX for BD market
- **COD is default** — payment integration is a later milestone
- **Always snapshot data on orders** — product names, prices, customer address freeze at order time so later edits to product/customer don't break old orders
- **Soft delete** for products, customers (add `deletedAt: Date | null`) — never hard delete records that have orders linked
- **Indexes:** `customers.phone (unique)`, `orders.orderNumber (unique)`, `orders.createdAt (desc)`, `orders.status`, `products.slug (unique)`, `transactions.date (desc)`

---

## Design Reference

Place all screenshots from kamiabprokashon.xyz in `/design-references/` with subfolders `desktop/` and `mobile/`. When asking Claude Code to build a component, reference the relevant screenshot file. The new design should match the original's organic/earthy feel but use modern component library polish (shadcn/ui).

Key visual elements to preserve:
- Green organic theme
- Bengali-first product cards
- Clean grid layout
- Featured/Best Selling section pattern
- Footer structure (Contact + Quick Link + Payment + Social)

---

## v2 Roadmap (do not build now, but architect for)

- Customer SMS notifications (toggle on)
- bKash / SSLCommerz online payment gateway
- Inventory low-stock alerts
- Coupon/discount codes
- Multi-warehouse support
- Customer reviews
- Wishlist
- Email notifications for admin (new order alerts)
- Multi-language toggle (Bengali/English)
- Analytics integrations (GA4, Meta Pixel — already partially on the WP site)


## Response Style
- No pleasantries, no "Sure, I'd be happy to..."
- No preamble before code blocks  
- Skip explanation if code is self-explanatory
- Keep technical terms exact, cut filler only
- Bangla/Banglish for discussion, English for code comments