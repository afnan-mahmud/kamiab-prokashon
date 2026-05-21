'use client';

import { Star } from 'lucide-react';
import { LandingCheckoutForm } from '../landing-checkout-form';
import type { LandingPage, Product, ContentSection } from '@cholonbil/types';

interface Props { page: LandingPage; product: Product; }

function Section({ section, primaryColor, productName }: { section: ContentSection; primaryColor: string; productName: string }) {
  switch (section.type) {
    case 'text': return <p className="leading-relaxed text-gray-600 max-w-xl mx-auto text-center">{section.content}</p>;
    case 'image': return <img src={section.url} alt={section.alt} className="w-full max-w-2xl mx-auto rounded-2xl object-cover shadow-md" />;
    case 'video': return <div className="aspect-video max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-md"><iframe src={section.embedUrl} className="h-full w-full" allowFullScreen /></div>;
    case 'features': return (
      <div className="flex flex-wrap justify-center gap-6 max-w-3xl mx-auto">
        {section.items.map((item, i) => (
          <div key={i} className="text-center w-40">
            <div className="text-4xl mb-2">{item.icon}</div>
            <p className="font-semibold text-sm">{item.title}</p>
            <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
          </div>
        ))}
      </div>
    );
    case 'testimonial': return (
      <div className="space-y-4 max-w-xl mx-auto">
        {section.items.map((item, i) => (
          <div key={i} className="rounded-xl border border-gray-200 p-4 bg-gray-50">
            <div className="flex gap-0.5 mb-2">{Array.from({ length: item.rating ?? 5 }).map((_, j) => <Star key={j} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />)}</div>
            <p className="text-sm italic text-gray-600 mb-2">&ldquo;{item.text}&rdquo;</p>
            <p className="text-xs font-semibold">— {item.name}</p>
          </div>
        ))}
      </div>
    );
    case 'faq': return (
      <div className="space-y-2 max-w-xl mx-auto">
        {section.items.map((item, i) => (
          <details key={i} className="rounded-lg border border-gray-200 bg-white">
            <summary className="cursor-pointer px-4 py-3 font-medium text-sm list-none">{item.q}</summary>
            <p className="px-4 pb-3 text-sm text-gray-600">{item.a}</p>
          </details>
        ))}
      </div>
    );
    case 'why_product': return (
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 max-w-xl mx-auto w-full">
        <h2 className="text-lg font-bold mb-4 text-center" style={{ color: primaryColor }}>
          কেন খাবেন আমাদের {productName}?
        </h2>
        <ul className="space-y-2">
          {section.items.map((point, i) => (
            <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
              <span className="mt-0.5 shrink-0" style={{ color: primaryColor }}>✓</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    );
    case 'why_us': return (
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 max-w-xl mx-auto w-full">
        <h2 className="text-lg font-bold mb-4 text-center" style={{ color: primaryColor }}>
          কেন আমাদের থেকে কিনবেন?
        </h2>
        <ul className="space-y-2">
          {section.items.map((point, i) => (
            <li key={i} className="flex items-start gap-2 text-gray-700 text-sm">
              <span className="mt-0.5 shrink-0" style={{ color: primaryColor }}>✓</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    );
    default: return null;
  }
}

export default function Template2({ page, product }: Props) {
  const { content } = page;
  const primary = content.colors?.primary ?? '#1f2937';
  const accent = content.colors?.accent ?? '#d97706';
  const bg = content.colors?.background ?? '#ffffff';

  return (
    <div style={{ backgroundColor: bg, fontFamily: 'Hind Siliguri, sans-serif' }} className="min-h-screen">
      {/* Minimal header bar */}
      <div className="border-b border-gray-100 py-4 px-4 text-center">
        <span className="text-sm font-semibold tracking-widest uppercase" style={{ color: primary }}>{product.name}</span>
      </div>

      {/* Split hero */}
      <div className="mx-auto max-w-5xl px-4 py-16 grid gap-12 lg:grid-cols-2 items-center">
        {product.images?.[0] && (
          <img src={product.images[0].url} alt={product.name} className="w-full rounded-2xl object-cover aspect-square" />
        )}
        <div className="space-y-6">
          <h1 className="text-3xl font-bold leading-tight" style={{ color: primary }}>{content.heroTitle || product.name}</h1>
          {content.heroSubtitle && <p className="text-gray-600">{content.heroSubtitle}</p>}
          <a href="#order" className="inline-block rounded-xl px-7 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: accent }}>
            {content.ctaText}
          </a>
        </div>
      </div>

      {/* Sections */}
      {content.sections.length > 0 && (
        <div className="mx-auto max-w-3xl px-4 py-8 space-y-12">
          {content.sections.map((s, i) => <Section key={i} section={s} primaryColor={primary} productName={product.name} />)}
        </div>
      )}

      {/* Order form */}
      <div id="order" className="py-16">
        <div className="mx-auto max-w-md px-4">
          <h2 className="text-2xl font-bold text-center mb-8" style={{ color: primary }}>অর্ডার করুন</h2>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <LandingCheckoutForm slug={page.slug} product={product} selectedVariantIds={page.selectedVariants} ctaText={content.ctaText} primaryColor={primary} accentColor={accent} />
          </div>
        </div>
      </div>
    </div>
  );
}
