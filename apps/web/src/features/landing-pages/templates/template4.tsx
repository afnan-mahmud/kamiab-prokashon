'use client';

import { Star } from 'lucide-react';
import { LandingCheckoutForm } from '../landing-checkout-form';
import type { LandingPage, Product, ContentSection } from '@cholonbil/types';

interface Props { page: LandingPage; product: Product; }

export default function Template4({ page, product }: Props) {
  const { content } = page;
  const primary = content.colors?.primary ?? '#7c3aed';
  const accent = content.colors?.accent ?? '#f59e0b';
  const bg = content.colors?.background ?? '#f8fafc';

  const features = content.sections.filter((s): s is Extract<ContentSection, { type: 'features' }> => s.type === 'features').flatMap((s) => s.items);
  const testimonials = content.sections.filter((s): s is Extract<ContentSection, { type: 'testimonial' }> => s.type === 'testimonial').flatMap((s) => s.items);
  const faqs = content.sections.filter((s): s is Extract<ContentSection, { type: 'faq' }> => s.type === 'faq').flatMap((s) => s.items);
  const images = content.sections.filter((s): s is Extract<ContentSection, { type: 'image' }> => s.type === 'image');
  const whyProductItems = content.sections.filter((s): s is Extract<ContentSection, { type: 'why_product' }> => s.type === 'why_product').flatMap((s) => s.items);
  const whyUsItems = content.sections.filter((s): s is Extract<ContentSection, { type: 'why_us' }> => s.type === 'why_us').flatMap((s) => s.items);

  return (
    <div style={{ backgroundColor: bg, fontFamily: 'Hind Siliguri, sans-serif' }}>
      {/* Compact top bar */}
      <div className="text-white py-2 text-center text-sm font-medium" style={{ backgroundColor: primary }}>
        🌿 ১০০% অর্গানিক — সরাসরি কৃষক থেকে আপনার দরজায়
      </div>

      {/* Hero grid */}
      <div className="mx-auto max-w-6xl px-4 py-12 grid gap-8 lg:grid-cols-2 items-start">
        {/* Left: product images grid */}
        <div className="grid grid-cols-2 gap-3">
          {product.images.slice(0, 4).map((img, i) => (
            <img key={i} src={img.url} alt={img.alt ?? product.name} className={`w-full rounded-xl object-cover ${i === 0 ? 'col-span-2 aspect-video' : 'aspect-square'}`} />
          ))}
          {images.slice(0, Math.max(0, 4 - product.images.length)).map((img, i) => (
            <img key={`extra-${i}`} src={img.url} alt={img.alt} className="w-full rounded-xl object-cover aspect-square" />
          ))}
        </div>

        {/* Right: info + form */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold leading-tight" style={{ color: primary }}>
              {content.heroTitle || product.name}
            </h1>
            {content.heroSubtitle && <p className="mt-2 text-gray-600">{content.heroSubtitle}</p>}
          </div>

          {/* Quick features */}
          {features.slice(0, 4).length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {features.slice(0, 4).map((f, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                  <span>{f.icon}</span>
                  <span className="font-medium">{f.title}</span>
                </div>
              ))}
            </div>
          )}

          {/* Order form */}
          <div id="order" className="rounded-2xl bg-white p-5 shadow-md border border-gray-100">
            <p className="font-bold text-center mb-4" style={{ color: primary }}>এখনই অর্ডার করুন</p>
            <LandingCheckoutForm slug={page.slug} product={product} selectedVariantIds={page.selectedVariants} ctaText={content.ctaText} primaryColor={primary} accentColor={accent} />
          </div>
        </div>
      </div>

      {/* Full feature grid */}
      {features.length > 4 && (
        <div className="py-12" style={{ backgroundColor: primary + '08' }}>
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="text-2xl font-bold text-center mb-8" style={{ color: primary }}>আমাদের বিশেষত্ব</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f, i) => (
                <div key={i} className="text-center rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                  <div className="text-4xl mb-3">{f.icon}</div>
                  <h3 className="font-bold text-sm mb-1">{f.title}</h3>
                  <p className="text-xs text-gray-600">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Why product section */}
      {whyProductItems.length > 0 && (
        <div className="py-10 mx-auto max-w-3xl px-4">
          <h2 className="text-2xl font-bold text-center mb-6" style={{ color: primary }}>
            কেন খাবেন আমাদের {product.name}?
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {whyProductItems.map((point, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm border border-gray-100">
                <span className="font-bold shrink-0" style={{ color: accent }}>✓</span>
                <span className="text-gray-700 text-sm">{point}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Why buy from us section */}
      {whyUsItems.length > 0 && (
        <div className="py-10" style={{ backgroundColor: primary + '08' }}>
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-2xl font-bold text-center mb-6" style={{ color: primary }}>
              কেন আমাদের থেকে কিনবেন?
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {whyUsItems.map((point, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm border border-gray-100">
                  <span className="font-bold shrink-0" style={{ color: accent }}>✓</span>
                  <span className="text-gray-700 text-sm">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <div className="py-12 mx-auto max-w-5xl px-4">
          <h2 className="text-2xl font-bold text-center mb-8" style={{ color: primary }}>গ্রাহকদের মতামত</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t, i) => (
              <div key={i} className="rounded-xl bg-white p-5 shadow-sm border border-gray-100">
                <div className="flex gap-0.5 mb-3">{Array.from({ length: t.rating ?? 5 }).map((_, j) => <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}</div>
                <p className="text-sm text-gray-700 italic mb-3">&ldquo;{t.text}&rdquo;</p>
                <p className="font-semibold text-sm">— {t.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAQ */}
      {faqs.length > 0 && (
        <div className="py-12" style={{ backgroundColor: primary + '08' }}>
          <div className="mx-auto max-w-2xl px-4">
            <h2 className="text-2xl font-bold text-center mb-8" style={{ color: primary }}>সাধারণ প্রশ্নাবলী</h2>
            <div className="space-y-2">
              {faqs.map((f, i) => (
                <details key={i} className="rounded-xl border border-gray-200 bg-white">
                  <summary className="cursor-pointer px-5 py-4 font-semibold list-none">{f.q}</summary>
                  <p className="px-5 pb-4 text-sm text-gray-600">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom CTA */}
      <div className="py-12 text-center" style={{ backgroundColor: primary }}>
        <h2 className="text-2xl font-bold text-white mb-4">আজই শুরু করুন</h2>
        <a href="#order" className="inline-block rounded-xl px-10 py-3.5 text-base font-bold text-white hover:opacity-90 transition-opacity" style={{ backgroundColor: accent }}>
          {content.ctaText}
        </a>
      </div>
    </div>
  );
}
