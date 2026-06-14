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
