// Shared delivery-charge resolution.
// Rule: if any item carries an active per-variant custom delivery charge, the
// order's delivery charge is the HIGHEST custom charge for the location (flat,
// no weight extra). Otherwise fall back to the standard weight-based formula.

export interface DeliveryChargeSettings {
  insideDhaka: number;
  outsideDhaka: number;
  extraPerKg: number;
  baseWeightKg: number;
}

export interface DeliveryItem {
  weight: number;
  quantity: number;
  customDelivery?: { insideDhaka: number; outsideDhaka: number } | null;
}

export const DEFAULT_CHARGES: DeliveryChargeSettings = {
  insideDhaka: 60,
  outsideDhaka: 120,
  extraPerKg: 20,
  baseWeightKg: 1,
};

export function resolveDeliveryCharge(
  items: DeliveryItem[],
  location: 'inside_dhaka' | 'outside_dhaka',
  charges: DeliveryChargeSettings = DEFAULT_CHARGES,
): number {
  const inside = location === 'inside_dhaka';

  const customCharges = items
    .filter((i) => i.customDelivery != null)
    .map((i) =>
      inside ? i.customDelivery!.insideDhaka : i.customDelivery!.outsideDhaka,
    );

  if (customCharges.length > 0) {
    return Math.max(...customCharges);
  }

  const totalWeight = items.reduce((s, i) => s + i.weight * i.quantity, 0);
  const extra = Math.max(0, totalWeight - charges.baseWeightKg);
  return (inside ? charges.insideDhaka : charges.outsideDhaka) + extra * charges.extraPerKg;
}
