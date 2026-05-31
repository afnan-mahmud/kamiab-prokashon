# Per-Product Custom Delivery Charge — Design

**Date:** 2026-05-31
**Status:** Approved (design), pending implementation plan

## Problem

Delivery charge is currently computed from a single global `DeliverySettings`
document (base inside/outside Dhaka charge + extra-per-kg by weight), applied
uniformly to every order. Some products need their own delivery pricing that
ignores the weight-based formula — e.g. a heavy or bulky item that the store
wants to ship at a fixed flat rate.

Admins need to set, per product, a custom inside-Dhaka and outside-Dhaka
delivery charge — optionally different per variant — during product create or
edit, behind an opt-in toggle.

## Decisions (confirmed with user)

1. **Scope:** Per **variant**. Each variant can have its own inside/outside
   Dhaka charge.
2. **Override type:** **Flat replace.** The custom charge IS the final delivery
   charge for an order that contains that variant — no base + no extra-per-kg
   weight charge added, no multiply by quantity.
3. **Multi-item cart:** **Highest custom wins.** If the cart contains any item
   with a custom delivery charge, the order's delivery charge = the maximum
   custom charge (for the order's location) among those items; standard
   weight-based calculation is ignored. If no cart item has a custom charge,
   standard calculation applies as today.
4. **Persistence:** When the toggle is OFF, previously entered custom values are
   still stored in the DB (not cleared) — they are simply not applied. Toggling
   back ON re-activates them without re-entry.

## Data Model

### Product (`apps/api/src/models/Product.ts`)

Add at product level:

```ts
customDeliveryEnabled: boolean;   // default false
```

Add at variant level (optional subdocument, `_id: false`):

```ts
customDelivery?: {
  insideDhaka: number;   // >= 0
  outsideDhaka: number;  // >= 0
};
```

Semantics: a variant has an active custom charge **iff**
`product.customDeliveryEnabled === true` AND `variant.customDelivery` is set.

### Shared types (`packages/types/src/product.ts`)

- `ProductVariant.customDelivery?: { insideDhaka: number; outsideDhaka: number }`
- `Product.customDeliveryEnabled: boolean`
- `CreateProductInput` / `UpdateProductInput` follow via existing
  `Omit`/`Partial` derivation; add `customDeliveryEnabled?: boolean`.

## Delivery Charge Resolution

A single shared rule, implemented once on the backend (authoritative) and
mirrored on the frontend for display.

```
resolveDeliveryCharge(items, location, settings):
    candidates = []
    for item in items:
        if item has active customDelivery:
            candidates.push(location == inside_dhaka
                ? item.customDelivery.insideDhaka
                : item.customDelivery.outsideDhaka)
    if candidates not empty:
        return max(candidates)              # flat, highest custom wins
    # fallback: existing standard weight calc
    totalWeight = sum(item.weight * item.quantity)
    extra = max(0, totalWeight - settings.baseWeightKg)
    base = location == inside_dhaka ? settings.insideDhaka : settings.outsideDhaka
    return base + extra * settings.extraPerKg
```

"item has active customDelivery" on the backend = look up the product +
variant and check `customDeliveryEnabled` + `variant.customDelivery`. On the
frontend cart, the flag is snapshotted onto the cart item at add-to-cart time.

## Backend Changes

- **`models/Product.ts`** — add `customDeliveryEnabled` + variant
  `customDelivery` subdoc.
- **`routes/admin/products.routes.ts`** — extend Zod `variantSchema` with
  optional `customDelivery` and `productSchema` with `customDeliveryEnabled`
  (default false). Applies to both POST (create) and PATCH (update).
- **Delivery helper** — add `resolveDeliveryCharge` (e.g. in
  `services/delivery.service.ts` or a small util). Pure function over already
  loaded order items + location + settings.
- **`routes/public/orders.routes.ts`** — replace the inline weight calc with
  `resolveDeliveryCharge`. Variant docs are already loaded when building
  `orderItems`, so each item knows its `customDelivery` + the product's enabled
  flag. Backend stays authoritative for the stored `order.deliveryCharge`.
- **Manual/admin order creation** (if it computes delivery) — use the same
  helper.

## Frontend Changes

### Admin product form (`features/products/product-form.tsx`)

- Add Zod fields: `customDeliveryEnabled: boolean` and per-variant
  `customDelivery: { insideDhaka, outsideDhaka }` (coerced numbers, optional).
- Below the Variants section, a **toggle** (`Switch`) labelled
  "Custom Delivery Charge", default OFF.
- Toggling ON opens a **modal** (shadcn `Dialog`) listing the product's current
  variants; each row has `Inside Dhaka (৳)` and `Outside Dhaka (৳)` number
  inputs. Save writes into form state.
- A small "Edit charges" affordance next to the toggle reopens the modal while
  ON.
- Toggling OFF sets `customDeliveryEnabled=false` but keeps the entered values
  in form state (and thus persisted on save).
- On edit, populate toggle + modal values from the loaded product.

### Cart store (`stores/cart.store.ts`)

- Add `customDelivery?: { insideDhaka: number; outsideDhaka: number }` to
  `CartItem`. Only populated when the product's toggle is on and the variant has
  a custom charge.

### Add-to-cart call sites

- `components/public/product-card.tsx` and `app/products/[slug]/page.tsx` —
  include the variant's resolved `customDelivery` when calling `addItem`.

### Website checkout (`app/checkout/page.tsx`)

- Replace `calcDeliveryCharge` usage with the shared `resolveDeliveryCharge`
  reading custom charges off cart items.

### Landing checkout (`features/landing-pages/landing-checkout-form.tsx`)

- It already holds the full product + variant, so resolve directly:
  if `product.customDeliveryEnabled` and the selected variant has
  `customDelivery`, use it (flat); else standard calc.

## Edge Cases

- Custom enabled but a variant's charge is `0` → treated as free delivery
  (valid, allowed).
- Mixed cart (custom + standard items) → highest custom wins; standard items
  contribute nothing to delivery.
- Frontend/backend mismatch → backend value is authoritative and is what gets
  saved on the order.
- Toggle ON but no variant has custom values set → every variant falls back to
  standard calc (no-op until values are entered).

## Out of Scope (YAGNI)

- Per-area / per-city granular custom charges (only inside/outside Dhaka).
- Free-shipping thresholds, coupon interaction.
- Bulk-editing custom delivery across multiple products.

## Testing

- Unit: `resolveDeliveryCharge` — no custom (standard), single custom (flat),
  multiple custom (max wins), mixed custom+standard, custom value 0, toggle off
  ignores stored values.
- Integration: create + update product with custom delivery via admin routes;
  order creation stores correct `deliveryCharge` for inside vs outside.
- Manual: admin form toggle/modal round-trip on create and edit; checkout +
  landing display matches stored charge.
