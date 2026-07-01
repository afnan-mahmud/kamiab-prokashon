const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

function toBengaliDigits(n: string): string {
  return n.replace(/[0-9]/g, (d) => BENGALI_DIGITS[Number(d)] ?? d);
}

// Formats a BDT integer price as Bengali-digit currency: ৳ ১,২০০
export function formatPrice(amount: number): string {
  const formatted = amount.toLocaleString('en-IN');
  return '৳ ' + toBengaliDigits(formatted);
}

// Formats a number with Bengali digits only (no symbol)
export function toBengali(n: number): string {
  return toBengaliDigits(String(n));
}

// Returns the integer discount percent when regular > price, else null.
export function discountPercent(regular?: number, price?: number): number | null {
  if (!regular || !price || regular <= price) return null;
  return Math.round(((regular - price) / regular) * 100);
}
