'use client';

import { Star, ShieldCheck, Truck, CheckCircle } from 'lucide-react';
import { LandingCheckoutForm } from '../landing-checkout-form';
import { fixImageUrl } from '@/lib/image-url';
import type { LandingPage, Product, ContentSection } from '@cholonbil/types';

interface Props {
  page: LandingPage;
  product: Product;
}

export default function Template4({ page, product }: Props) {
  const { content } = page;
  const primary = content.colors?.primary ?? '#7c3aed';
  const accent = content.colors?.accent ?? '#f59e0b';
  const bg = content.colors?.background ?? '#f8fafc';

  const features = content.sections
    .filter((s): s is Extract<ContentSection, { type: 'features' }> => s.type === 'features')
    .flatMap((s) => s.items);
  const testimonials = content.sections
    .filter((s): s is Extract<ContentSection, { type: 'testimonial' }> => s.type === 'testimonial')
    .flatMap((s) => s.items);
  const faqs = content.sections
    .filter((s): s is Extract<ContentSection, { type: 'faq' }> => s.type === 'faq')
    .flatMap((s) => s.items);
  const extraImages = content.sections.filter(
    (s): s is Extract<ContentSection, { type: 'image' }> => s.type === 'image',
  );
  const whyProductItems = content.sections
    .filter(
      (s): s is Extract<ContentSection, { type: 'why_product' }> => s.type === 'why_product',
    )
    .flatMap((s) => s.items);
  const whyUsItems = content.sections
    .filter((s): s is Extract<ContentSection, { type: 'why_us' }> => s.type === 'why_us')
    .flatMap((s) => s.items);

  const allImages = [
    ...product.images.slice(0, 4).map((img) => ({ url: img.url, alt: img.alt ?? product.name })),
    ...extraImages
      .slice(0, Math.max(0, 4 - product.images.length))
      .map((img) => ({ url: img.url, alt: img.alt })),
  ];

  return (
    <div
      style={{ backgroundColor: bg, fontFamily: 'Hind Siliguri, sans-serif' }}
      className="pb-20 md:pb-0"
    >
      {/* Announcement bar */}
      <div
        className="text-center py-2.5 px-4 text-xs sm:text-sm font-medium text-white"
        style={{
          background: `linear-gradient(90deg, ${primary} 0%, ${primary}cc 100%)`,
        }}
      >
        🌿 ১০০% অর্গানিক — সরাসরি কৃষক থেকে আপনার দরজায় &nbsp;•&nbsp; ক্যাশ অন ডেলিভারি
      </div>

      {/* Hero: product gallery left + info+form right */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          {/* Product image grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {allImages.map((img, i) => (
              <img
                key={i}
                src={fixImageUrl(img.url)}
                alt={img.alt}
                className={`w-full rounded-2xl object-cover shadow-sm ${
                  i === 0 ? 'col-span-2 aspect-video sm:aspect-[16/7]' : 'aspect-square'
                }`}
              />
            ))}
            {allImages.length === 0 && product.images[0] && (
              <img
                src={fixImageUrl(product.images[0].url)}
                alt={product.name}
                className="col-span-2 w-full rounded-2xl object-cover aspect-video shadow-sm"
              />
            )}
          </div>

          {/* Right: info + form */}
          <div className="space-y-5">
            {/* Badge + title */}
            <div>
              <div
                className="inline-block rounded-full px-3 py-1 text-xs font-semibold mb-2"
                style={{ backgroundColor: primary + '15', color: primary }}
              >
                প্রিমিয়াম অর্গানিক
              </div>
              <h1
                className="text-2xl sm:text-3xl font-extrabold leading-tight"
                style={{ color: primary }}
              >
                {content.heroTitle || product.name}
              </h1>
              {content.heroSubtitle && (
                <p className="mt-2 text-gray-600 text-sm leading-relaxed">
                  {content.heroSubtitle}
                </p>
              )}
            </div>

            {/* Trust signals */}
            <div className="flex flex-wrap gap-2">
              {[
                { icon: <ShieldCheck className="h-3.5 w-3.5" />, text: '১০০% অর্গানিক' },
                { icon: <Truck className="h-3.5 w-3.5" />, text: 'দ্রুত ডেলিভারি' },
              ].map((b, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                  style={{ backgroundColor: primary + '12', color: primary }}
                >
                  {b.icon} {b.text}
                </div>
              ))}
            </div>

            {/* Quick features (max 4) */}
            {features.slice(0, 4).length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {features.slice(0, 4).map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-sm shadow-sm"
                  >
                    <span className="text-lg shrink-0">{f.icon}</span>
                    <span className="font-medium text-gray-700 text-xs sm:text-sm leading-snug">
                      {f.title}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Order form */}
            <div id="order" className="rounded-2xl bg-white p-5 shadow-lg border border-gray-100">
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="w-1 h-6 rounded-full"
                  style={{ backgroundColor: primary }}
                />
                <p className="font-bold text-base" style={{ color: primary }}>
                  এখনই অর্ডার করুন
                </p>
              </div>
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

      {/* Full feature grid (remaining beyond 4) */}
      {features.length > 4 && (
        <div className="py-12" style={{ backgroundColor: primary + '08' }}>
          <div className="mx-auto max-w-5xl px-4">
            <h2 className="text-2xl font-extrabold text-center mb-8" style={{ color: primary }}>
              আমাদের বিশেষত্ব
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="text-center rounded-2xl bg-white p-5 shadow-sm border border-gray-100"
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-3"
                    style={{ backgroundColor: primary + '12' }}
                  >
                    {f.icon}
                  </div>
                  <h3 className="font-bold text-sm mb-1 text-gray-800">{f.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Why product */}
      {whyProductItems.length > 0 && (
        <div className="py-10 mx-auto max-w-3xl px-4">
          <h2 className="text-2xl font-extrabold text-center mb-6" style={{ color: primary }}>
            কেন খাবেন আমাদের {product.name}?
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {whyProductItems.map((point, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm border border-gray-100"
              >
                <span
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5"
                  style={{ backgroundColor: accent }}
                >
                  ✓
                </span>
                <span className="text-gray-700 text-sm leading-relaxed">{point}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Why us */}
      {whyUsItems.length > 0 && (
        <div className="py-10" style={{ backgroundColor: primary + '08' }}>
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-2xl font-extrabold text-center mb-6" style={{ color: primary }}>
              কেন আমাদের থেকে কিনবেন?
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {whyUsItems.map((point, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm border border-gray-100"
                >
                  <CheckCircle
                    className="h-5 w-5 shrink-0 mt-0.5"
                    style={{ color: primary }}
                  />
                  <span className="text-gray-700 text-sm leading-relaxed">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <div className="py-12 mx-auto max-w-5xl px-4">
          <h2 className="text-2xl font-extrabold text-center mb-8" style={{ color: primary }}>
            গ্রাহকদের মতামত
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white p-5 shadow-md border border-gray-100"
              >
                <div className="flex gap-0.5 mb-3">
                  {Array.from({ length: t.rating ?? 5 }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-700 italic leading-relaxed mb-4">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: primary }}
                  >
                    {t.name?.charAt(0) ?? '?'}
                  </div>
                  <p className="font-semibold text-sm">{t.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FAQ */}
      {faqs.length > 0 && (
        <div className="py-12" style={{ backgroundColor: primary + '08' }}>
          <div className="mx-auto max-w-2xl px-4">
            <h2 className="text-2xl font-extrabold text-center mb-8" style={{ color: primary }}>
              সাধারণ প্রশ্নাবলী
            </h2>
            <div className="space-y-3">
              {faqs.map((f, i) => (
                <details
                  key={i}
                  className="group rounded-2xl border border-gray-200 bg-white overflow-hidden"
                >
                  <summary className="cursor-pointer px-5 py-4 font-semibold list-none flex items-center justify-between gap-3 select-none">
                    <span className="flex-1">{f.q}</span>
                    <span
                      className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xl font-light"
                      style={{ backgroundColor: primary }}
                    >
                      +
                    </span>
                  </summary>
                  <p className="px-5 pb-5 text-sm text-gray-600 border-t border-gray-100 pt-4 leading-relaxed">
                    {f.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom CTA banner */}
      <div
        className="py-14 text-center"
        style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 100%)` }}
      >
        <div className="mx-auto max-w-xl px-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3">
            আজই অর্ডার করুন
          </h2>
          <p className="text-white/70 text-sm mb-6">পণ্য পেয়ে টাকা দিন — ক্যাশ অন ডেলিভারি</p>
          <a
            href="#order"
            className="inline-flex items-center gap-2 rounded-2xl px-10 py-4 text-base font-bold text-white shadow-xl hover:scale-105 active:scale-95 transition-transform"
            style={{ backgroundColor: accent }}
          >
            {content.ctaText}
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </a>
        </div>
      </div>

      {/* Sticky mobile CTA */}
      <div className="fixed bottom-0 inset-x-0 z-40 md:hidden p-3">
        <a
          href="#order"
          className="flex items-center justify-center gap-2 w-full rounded-2xl py-4 text-base font-bold text-white shadow-2xl"
          style={{ backgroundColor: accent }}
        >
          {content.ctaText}
        </a>
      </div>
    </div>
  );
}
