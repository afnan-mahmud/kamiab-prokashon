// GA4 ecommerce dataLayer helpers for Google Tag Manager (GTM-PDHJ7TRW).
// These push standard GA4 ecommerce events so GTM can forward them to GA4,
// Meta, or any other tag. Schema: https://developers.google.com/tag-platform/gtagjs/reference/events

const CURRENCY = 'BDT';

export interface GtmItem {
  item_id: string;
  item_name: string;
  item_variant?: string;
  item_category?: string;
  price: number;
  quantity: number;
}

type DataLayerObject = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: DataLayerObject[];
  }
}

/** Low-level push. Clears the previous `ecommerce` object first (GA4 best practice). */
function pushEcommerce(event: string, ecommerce: DataLayerObject): void {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push({ event, ecommerce });
}

function itemsValue(items: GtmItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function gtmViewItem(item: GtmItem): void {
  pushEcommerce('view_item', {
    currency: CURRENCY,
    value: item.price * item.quantity,
    items: [item],
  });
}

export function gtmAddToCart(item: GtmItem): void {
  pushEcommerce('add_to_cart', {
    currency: CURRENCY,
    value: item.price * item.quantity,
    items: [item],
  });
}

export function gtmBeginCheckout(items: GtmItem[]): void {
  pushEcommerce('begin_checkout', {
    currency: CURRENCY,
    value: itemsValue(items),
    items,
  });
}

export function gtmPurchase(params: {
  transactionId: string;
  value: number;
  shipping?: number;
  items: GtmItem[];
}): void {
  pushEcommerce('purchase', {
    transaction_id: params.transactionId,
    currency: CURRENCY,
    value: params.value,
    shipping: params.shipping ?? 0,
    items: params.items,
  });
}
