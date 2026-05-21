'use client';

import { Star } from 'lucide-react';
import { LandingCheckoutForm } from '../landing-checkout-form';
import type { LandingPage, Product, ContentSection } from '@cholonbil/types';

interface Props {
  page: LandingPage;
  product: Product;
}

function SectionRenderer({ section, primaryColor, productName }: { section: ContentSection; primaryColor: string; productName: string }) {
  switch (section.type) {
    case 'text':
      return <p className="leading-relaxed text-gray-700 whitespace-pre-line">{section.content}</p>;
    case 'image':
      return (
        <div className="overflow-hidden rounded-2xl">
          <img src={section.url} alt={section.alt} className="w-full object-cover" />
        </div>
      );
    case 'video':
      return (
        <div className="aspect-video overflow-hidden rounded-2xl">
          <iframe src={section.embedUrl} className="h-full w-full" allowFullScreen />
        </div>
      );
    case 'features':
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {section.items.map((item, i) => (
            <div key={i} className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
              <div className="text-3xl mb-2">{item.icon}</div>
              <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
              <p className="text-sm text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      );
    case 'testimonial':
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          {section.items.map((item, i) => (
            <div key={i} className="rounded-xl bg-white p-4 shadow-sm border border-gray-100">
              <div className="flex gap-0.5 mb-2">
                {Array.from({ length: item.rating ?? 5 }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-gray-700 italic mb-3">&ldquo;{item.text}&rdquo;</p>
              <p className="font-semibold text-sm">— {item.name}</p>
            </div>
          ))}
        </div>
      );
    case 'faq':
      return (
        <div className="space-y-3">
          {section.items.map((item, i) => (
            <details key={i} className="rounded-xl border border-gray-200 bg-white">
              <summary className="cursor-pointer px-5 py-4 font-semibold text-gray-900 list-none flex items-center justify-between">
                {item.q}
                <span className="text-gray-400 ml-4">+</span>
              </summary>
              <p className="px-5 pb-4 text-sm text-gray-600">{item.a}</p>
            </details>
          ))}
        </div>
      );
    case 'why_product':
      return (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-4" style={{ color: primaryColor }}>
            কেন খাবেন আমাদের {productName}?
          </h2>
          <ul className="space-y-2">
            {section.items.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-700">
                <span className="mt-0.5 shrink-0" style={{ color: primaryColor }}>✓</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case 'why_us':
      return (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-4" style={{ color: primaryColor }}>
            কেন আমাদের থেকে কিনবেন?
          </h2>
          <ul className="space-y-2">
            {section.items.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-gray-700">
                <span className="mt-0.5 shrink-0" style={{ color: primaryColor }}>✓</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    default:
      return null;
  }
}

export default function Template1({ page, product }: Props) {
  const { content } = page;
  const primary = content.colors?.primary ?? '#4a7c2e';
  const accent = content.colors?.accent ?? '#d97706';
  const bg = content.colors?.background ?? '#fefcf7';

  return (
    <div style={{ backgroundColor: bg, fontFamily: 'Hind Siliguri, sans-serif' }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ backgroundColor: primary }}>
        {content.heroImage?.url && (
          <img src={content.heroImage.url} alt="Hero" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        )}
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div className="text-white space-y-6">
              <h1 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
                {content.heroTitle || product.name}
              </h1>
              {content.heroSubtitle && (
                <p className="text-lg opacity-90">{content.heroSubtitle}</p>
              )}
              <a
                href="#order"
                className="inline-block rounded-xl px-8 py-3.5 text-base font-bold transition-opacity hover:opacity-90"
                style={{ backgroundColor: accent, color: 'white' }}
              >
                {content.ctaText}
              </a>
            </div>
            {product.images?.[0] && (
              <div className="flex justify-center">
                <img
                  src={product.images[0].url}
                  alt={product.name}
                  className="w-64 sm:w-80 rounded-2xl shadow-2xl object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content sections */}
      {content.sections.length > 0 && (
        <div className="mx-auto max-w-4xl px-4 py-12 space-y-10">
          {content.sections.map((section, i) => (
            <SectionRenderer key={i} section={section} primaryColor={primary} productName={product.name} />
          ))}
        </div>
      )}

      {/* Order form */}
      <div id="order" className="py-12">
        <div className="mx-auto max-w-md px-4">
          <div className="rounded-2xl bg-white shadow-xl border border-gray-100 p-6 sm:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
              এখনই অর্ডার করুন
            </h2>
            <LandingCheckoutForm
              slug={page.slug}
              product={product}
              selectedVariantIds={page.selectedVariants}
              ctaText={content.ctaText}
              primaryColor={primary}
              accentColor={accent}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
