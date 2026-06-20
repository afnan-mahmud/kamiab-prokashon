# Stock Management — Design Spec
**Date:** 2026-05-19  
**Project:** Kamiab Prokashon  
**Pattern:** Inventory Ledger (Option A)

---

## Overview

Add a full inventory tracking system to the admin panel. Every stock change — purchase receipt, order sale, courier return (resalable or damaged), manual adjustment — is recorded as an immutable `StockMovement` document. The `variant.stock` counter on the product is a denormalized cache kept in sync via a single service function. Orders are hard-blocked when stock is insufficient.

---

## Data Model

### New collection: `stockMovements`

```ts
{
  _id,
  type: 'purchase'           // stock received from supplier
       | 'sale'              // deducted when an order is placed
       | 'return_resalable'  // courier return → good → back to stock
       | 'return_damaged'    // courier return → damaged → written off
       | 'adjustment',       // manual correction (positive or negative)

  product:  ObjectId,        // ref Product
  variant:  ObjectId,        // variant subdocument _id

  // For purchase / return_resalable / adjustment(+): positive — added to stock
  // For sale / adjustment(-): negative — subtracted from stock
  // For return_damaged: positive count of damaged units — stored for audit, does NOT change stock
  qty: number,

  // snapshots — stay readable if product is renamed/deleted
  productName:  string,
  variantLabel: string,

  // purchase-only optional fields
  unitCost:     number | null,
  supplier:     string | null,
  purchaseDate: Date | null,
  reference:    string | null,   // lot number / invoice ref

  // sale and return fields
  orderId:      ObjectId | null, // ref Order
  orderNumber:  string | null,

  note:      string,
  createdBy: ObjectId | null,    // ref User; null = system-generated
  createdAt: Date,
}
```

**Indexes:**
```
{ product, variant, createdAt: -1 }
{ orderId }
{ type, createdAt: -1 }
```

### Changes to `Product.variants[]`

Add one new field:
```ts
reorderPoint: number   // default 0 = no alert threshold
```

`stock` already exists. It remains the denormalized live count, always updated atomically alongside a movement record.

### New order status

Add `'Returned'` to the `OrderStatus` enum. Terminal state after a courier return is processed via the return modal.

---

## Backend

### `stock.service.ts`

Single entry point for all stock writes. Nothing else touches `variant.stock` directly.

```ts
createMovement(input: {
  type: MovementType
  productId: string
  variantId: string
  qty: number               // positive for in, negative for out
  orderId?: string
  orderNumber?: string
  unitCost?: number
  supplier?: string
  purchaseDate?: Date
  reference?: string
  note?: string
  createdBy?: string
}): Promise<StockMovement>
```

Internals:
1. For `type === 'sale'`: use a **conditional atomic update** — not a check-then-update (race-unsafe):
   ```ts
   const updated = await Product.findOneAndUpdate(
     { 'variants._id': variantId, 'variants.stock': { $gte: Math.abs(qty) } },
     { $inc: { 'variants.$.stock': qty } },
     { new: true, session }
   );
   if (!updated) throw new StockError('INSUFFICIENT_STOCK', variantLabel);
   ```
2. For all other types **except `return_damaged`**: `$inc` variant.stock by `qty`.
3. `return_damaged`: save the movement document only — no `$inc` (damaged units are written off, not returned to stock).
4. Append `StockMovements` document in the same session.
5. Commit session.

### API Endpoints

```
# Movement log
GET  /api/admin/stock/movements
     ?productId= &variantId= &type= &from= &to= &page= &limit=
     → paginated, newest first

# Purchase receipt (add stock)
POST /api/admin/stock/movements
     { productId, variantId, qty, unitCost?, supplier?,
       purchaseDate?, reference?, note? }
     Permission: stock.edit

# Manual adjustment (qty signed, note required)
POST /api/admin/stock/adjust
     { productId, variantId, qty, note }
     Permission: stock.edit

# Low-stock summary + today's movement count
GET  /api/admin/stock/summary
     Permission: stock.view

# Process courier return
POST /api/admin/orders/:id/return
     { items: [{ variantId, resalableQty, damagedQty }], note? }
     Permission: orders.edit
     → creates return_resalable + return_damaged movements per item
     → sets order.status = 'Returned'
     → 409 if order already Returned
     → 400 if resalableQty + damagedQty > ordered qty for any item
```

### Order creation hooks

Both `POST /api/public/orders` and `POST /api/admin/orders` are modified:
- Before saving the order document, call `createMovement({ type: 'sale', qty: -quantity, ... })` for each item inside the same transaction.
- If any variant throws `INSUFFICIENT_STOCK`, the entire operation is rolled back and a 409 is returned to the client with the message "স্টক শেষ — [variant label]".

### Reorder point

Saved via the existing `PATCH /api/admin/products/:id` — the variants array already accepts extra fields. No new endpoint needed.

---

## Frontend

### New page: `/admin/stock`

**Sidebar nav:** new item between Products and Landing Pages, gated on `stock.view`.

**Tab 1 — Low Stock**
- Table: Product, Variant, Current Stock, Reorder Point, "Add Stock" shortcut button.
- Only shows variants where `stock ≤ reorderPoint` and `reorderPoint > 0`.
- Empty state: all stock is healthy.

**Tab 2 — Movement Log**
- Filters: product search, type badge filter, date range.
- Columns: Date, Product + Variant, Type (colored badge), Qty (`+5` green / `−2` red), Order #, Supplier / Note, By.
- Paginated, newest first.

**"Add Stock" modal** (top-right button + per-row shortcut):
- Product selector → Variant selector (dependent).
- Qty (positive integer, required).
- Unit Cost, Supplier, Purchase Date, Reference (all optional).
- Note (optional).

**"Adjust Stock" modal**:
- Product selector → Variant selector.
- Qty (signed integer — negative for correction, positive for surplus).
- Note (required).
- Shows current stock for context.

### Order detail page — Return Processing

A **"Process Return"** button is shown when:
- Order status is `'Hand over to Courier'` AND courier status is a return state (`partial_delivered`, `cancelled`, `unknown`).
- OR admin manually triggers it (button always visible for orders in `'Hand over to Courier'` state to handle cases where Steadfast status isn't synced).

Button is hidden when status is already `'Returned'`.

**Return modal:**
- One row per order item: Product + Variant label, Ordered Qty.
- Two number inputs per row: **Resalable Qty** | **Damaged Qty**.
- Row-level validation: resalable + damaged ≤ ordered qty.
- Note field (optional).
- Submit → `POST /api/admin/orders/:id/return`.

### Product edit form — reorder point

In the variants repeater, add a **"সতর্কতার সীমা"** column (number input, default 0). Saves with the existing product PATCH.

---

## Permissions

| Key | Description |
|---|---|
| `stock.view` | View `/admin/stock`, movement log, low-stock tab |
| `stock.edit` | Add stock (purchase), manual adjustment |

Return processing reuses `orders.edit` — no new permission needed.

Add both keys to the seed script's Admin role and to the permissions list in `CLAUDE.md`.

---

## Edge Cases

| Scenario | Behaviour |
|---|---|
| Race condition on last unit | `$inc` is atomic; hard-block check runs inside a MongoDB session — second concurrent request gets 409 |
| Order cancelled (not returned) | No automatic stock reversal; goods may still be in transit. Admin processes return via modal when goods physically arrive |
| Return qty exceeds ordered qty | API returns 400 |
| Double return processing | API returns 409 if order status is already `Returned` |
| Product variant deleted after order | Movement snapshots (`productName`, `variantLabel`) keep history readable |
| `reorderPoint = 0` | No alert — treated as "no threshold set" |
| Stock goes negative (data fix) | Manual adjustment with a note is the correction path; hard-block prevents it going negative via normal flows |
