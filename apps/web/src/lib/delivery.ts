import type { DeliveryCharges } from '@/features/shop/shop.api';

export interface DeliveryResolveItem {
  weight: number;
  quantity: number;
  customDelivery?: { insideDhaka: number; outsideDhaka: number } | null;
}

// Mirrors the backend rule (services/delivery.service.ts): if any item has an
// active custom delivery charge, the highest one for the location wins (flat);
// otherwise the standard weight-based formula applies.
export function resolveDeliveryCharge(
  items: DeliveryResolveItem[],
  location: 'inside_dhaka' | 'outside_dhaka',
  charges: DeliveryCharges,
): number {
  const inside = location === 'inside_dhaka';

  const customCharges = items
    .filter((i) => i.customDelivery != null)
    .map((i) => (inside ? i.customDelivery!.insideDhaka : i.customDelivery!.outsideDhaka));

  if (customCharges.length > 0) {
    return Math.max(...customCharges);
  }

  const totalWeight = items.reduce((s, i) => s + i.weight * i.quantity, 0);
  const extra = Math.max(0, totalWeight - charges.baseWeightKg);
  return (inside ? charges.insideDhaka : charges.outsideDhaka) + extra * charges.extraPerKg;
}
