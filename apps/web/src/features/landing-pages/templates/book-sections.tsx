'use client';

import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { BookPreviewModal } from '@/components/public/book-preview-modal';
import { fixImageUrl } from '@/lib/image-url';
import { toBengali } from '@/lib/format';
import type {
  Product,
  BookSpecsSection as BookSpecsSectionT,
  TocSection as TocSectionT,
  AuthorBioSection as AuthorBioSectionT,
} from '@kamiab/types';

const SPEC_ROWS: { key: keyof Product; label: string; bengali?: boolean }[] = [
  { key: 'author', label: 'লেখক' },
  { key: 'publisher', label: 'প্রকাশনী' },
  { key: 'translator', label: 'অনুবাদক' },
  { key: 'pages', label: 'পৃষ্ঠা', bengali: true },
  { key: 'language', label: 'ভাষা' },
  { key: 'binding', label: 'বাঁধাই' },
  { key: 'edition', label: 'সংস্করণ' },
  { key: 'isbn', label: 'ISBN' },
  { key: 'publicationYear', label: 'প্রকাশকাল', bengali: true },
];

export function BookSpecsSection({ section, product, primary }: { section: BookSpecsSectionT; product: Product; primary: string }) {
  const rows = SPEC_ROWS
    .map((r) => ({ label: r.label, value: product[r.key], bengali: r.bengali }))
    .filter((r) => r.value !== undefined && r.value !== null && r.value !== '');
  if (rows.length === 0) return null;
  return (
    <div className="rounded-2xl overflow-hidden shadow-md">
      <div className="px-6 py-4" style={{ backgroundColor: primary }}>
        <h2 className="text-lg font-bold text-white">{section.title || 'বই পরিচিতি'}</h2>
      </div>
      <table className="w-full bg-white text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-gray-100 last:border-0">
              <td className="px-5 py-3 font-medium text-gray-600 w-1/3">{r.label}</td>
              <td className="px-5 py-3 text-gray-900">
                {r.bengali ? toBengali(Number(r.value)) : String(r.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TocSection({ section, primary }: { section: TocSectionT; primary: string }) {
  if (!section.items?.length) return null;
  return (
    <div className="rounded-2xl bg-white p-5 shadow-md border border-gray-100">
      <h2 className="text-lg font-bold text-gray-900 mb-4">{section.title || 'সূচিপত্র'}</h2>
      <ol className="space-y-2">
        {section.items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
            <span
              className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: primary }}
            >
              {toBengali(i + 1)}
            </span>
            <span className="leading-relaxed pt-0.5">{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function AuthorBioSection({ section, primary }: { section: AuthorBioSectionT; primary: string }) {
  if (!section.name && !section.bio) return null;
  return (
    <div className="rounded-2xl bg-white p-5 shadow-md border border-gray-100 flex gap-4 items-start">
      {section.image?.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fixImageUrl(section.image.url)} alt={section.name} className="w-20 h-20 rounded-full object-cover shrink-0" />
      )}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: primary }}>লেখক পরিচিতি</p>
        <h3 className="font-bold text-gray-900">{section.name}</h3>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed whitespace-pre-line">{section.bio}</p>
      </div>
    </div>
  );
}

export function PreviewSection({ product, primary, title }: { product: Product; primary: string; title?: string }) {
  const [open, setOpen] = useState(false);
  const hasPreview = (product.previewImages?.length ?? 0) > 0 || !!product.previewPdf;
  if (!hasPreview) return null;
  return (
    <div className="rounded-2xl bg-white p-6 shadow-md border border-gray-100 text-center">
      <h2 className="text-lg font-bold text-gray-900 mb-3">{title || 'একটু পড়ে দেখুন'}</h2>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-semibold text-white"
        style={{ backgroundColor: primary }}
      >
        <BookOpen className="h-5 w-5" />
        একটু পড়ে দেখুন
      </button>
      <BookPreviewModal
        open={open}
        onOpenChange={setOpen}
        images={product.previewImages}
        pdf={product.previewPdf}
        title={product.name}
      />
    </div>
  );
}
