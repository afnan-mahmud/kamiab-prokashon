'use client';

import { Star, ShieldCheck, Truck } from 'lucide-react';
import { LandingCheckoutForm } from '../landing-checkout-form';
import { StickyOrderButton } from '../sticky-order-button';
import { fixImageUrl } from '@/lib/image-url';
import type { LandingPage, Product, ContentSection } from '@cholonbil/types';

interface Props {
  page: LandingPage;
  product: Product;
}

function Section({
  section,
  primary,
  accent,
  productName,
}: {
  section: ContentSection;
  primary: string;
  accent: string;
  productName: string;
}) {
  switch (section.type) {
    case 'text':
      return (
        <p className="text-base leading-relaxed text-gray-600 max-w-xl mx-auto text-center">
          {section.content}
        </p>
      );
    case 'image':
      return (
        <img
          src={fixImageUrl(section.url)}
          alt={section.alt}
          className="w-full max-w-2xl mx-auto rounded-2xl object-cover shadow-lg"
        />
      );
    case 'video':
      return (
        <div className="aspect-video max-w-2xl mx-auto rounded-2xl overflow-hidden shadow-lg">
          <iframe src={section.embedUrl} className="h-full w-full" allowFullScreen />
        </div>
      );
    case 'features':
      return (
        <div className="flex flex-wrap justify-center gap-5 max-w-3xl mx-auto">
          {section.items.map((item, i) => (
            <div key={i} className="text-center w-36 space-y-2">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mx-auto shadow-sm border border-gray-100"
                style={{ backgroundColor: primary + '10' }}
              >
                {item.icon}
              </div>
              <p className="font-semibold text-sm text-gray-800">{item.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      );
    case 'testimonial':
      return (
        <div className="space-y-4 max-w-xl mx-auto">
          {section.items.map((item, i) => (
            <div key={i} className="rounded-2xl border border-gray-100 p-5 bg-white shadow-sm">
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: item.rating ?? 5 }).map((_, j) => (
                  <Star key={j} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm italic text-gray-700 leading-relaxed mb-3">
                &ldquo;{item.text}&rdquo;
              </p>
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: primary }}
                >
                  {item.name?.charAt(0) ?? '?'}
                </div>
                <p className="text-xs font-semibold text-gray-800">{item.name}</p>
              </div>
            </div>
          ))}
        </div>
      );
    case 'faq':
      return (
        <div className="space-y-2 max-w-xl mx-auto">
          {section.items.map((item, i) => (
            <details
              key={i}
              className="group rounded-xl border border-gray-200 bg-white overflow-hidden"
            >
              <summary className="cursor-pointer px-5 py-3.5 font-medium text-sm list-none flex items-center justify-between gap-3 select-none">
                <span className="flex-1">{item.q}</span>
                <span
                  className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-base font-light"
                  style={{ backgroundColor: primary }}
                >
                  +
                </span>
              </summary>
              <p className="px-5 pb-4 text-sm text-gray-600 border-t border-gray-100 pt-3 leading-relaxed">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      );
    case 'why_product':
      return (
        <div className="max-w-xl mx-auto w-full rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div className="px-6 py-3.5" style={{ backgroundColor: primary + '15' }}>
            <h2 className="text-base font-bold" style={{ color: primary }}>
              কেন খাবেন আমাদের {productName}?
            </h2>
          </div>
          <div className="bg-white p-5 space-y-3">
            {section.items.map((point, i) => (
              <div key={i} className="flex items-start gap-3">
                <span
                  className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5"
                  style={{ backgroundColor: primary }}
                >
                  ✓
                </span>
                <span className="text-gray-700 text-sm leading-relaxed">{point}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case 'why_us':
      return (
        <div className="max-w-xl mx-auto w-full rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div className="px-6 py-3.5" style={{ backgroundColor: accent + '15' }}>
            <h2 className="text-base font-bold" style={{ color: accent }}>
              কেন আমাদের থেকে কিনবেন?
            </h2>
          </div>
          <div className="bg-white p-5 space-y-3">
            {section.items.map((point, i) => (
              <div key={i} className="flex items-start gap-3">
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
      );
    default:
      return null;
  }
}

export default function Template2({ page, product }: Props) {
  const { content } = page;
  const primary = content.colors?.primary ?? '#1f2937';
  const accent = content.colors?.accent ?? '#d97706';
  const bg = content.colors?.background ?? '#ffffff';

  return (
    <div
      style={{ backgroundColor: bg, fontFamily: 'Hind Siliguri, sans-serif' }}
      className="min-h-screen pb-20 md:pb-0"
    >
      {/* Sticky minimal header */}
      <div className="border-b border-gray-100 py-3.5 px-4 text-center bg-white sticky top-0 z-30 shadow-sm">
        <span className="text-sm font-bold tracking-wider uppercase" style={{ color: primary }}>
          {product.name}
        </span>
      </div>

      {/* Split hero */}
      <div className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-2 items-center">
          {/* Product image */}
          {product.images?.[0] && (
            <div className="relative">
              <div
                className="absolute -inset-4 rounded-3xl opacity-10 blur-xl"
                style={{ backgroundColor: accent }}
              />
              <img
                src={fixImageUrl(product.images[0].url)}
                alt={product.name}
                className="relative w-full rounded-2xl object-cover aspect-square shadow-xl"
              />
              {/* Floating badge */}
              <div
                className="absolute -bottom-3 -right-3 rounded-2xl px-4 py-2 text-white text-xs sm:text-sm font-bold shadow-lg"
                style={{ backgroundColor: accent }}
              >
                ১০০% অর্গানিক ✓
              </div>
            </div>
          )}

          {/* Content */}
          <div className="space-y-5">
            <div
              className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
              style={{ backgroundColor: primary + '12', color: primary }}
            >
              প্রিমিয়াম মানের পণ্য
            </div>
            <h1
              className="text-3xl sm:text-4xl font-extrabold leading-tight"
              style={{ color: primary }}
            >
              {content.heroTitle || product.name}
            </h1>
            {content.heroSubtitle && (
              <p className="text-gray-600 text-base leading-relaxed">{content.heroSubtitle}</p>
            )}
            {/* Trust badges */}
            <div className="flex flex-wrap gap-2">
              {[
                { icon: <ShieldCheck className="h-3.5 w-3.5" />, text: '১০০% অর্গানিক' },
                { icon: <Truck className="h-3.5 w-3.5" />, text: 'দ্রুত ডেলিভারি' },
              ].map((b, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                  style={{ backgroundColor: primary + '10', color: primary }}
                >
                  {b.icon} {b.text}
                </div>
              ))}
            </div>
            <a
              href="#order"
              className="inline-flex items-center gap-2 rounded-2xl px-7 py-3.5 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
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
            <p className="text-xs text-gray-400">পণ্য পেয়ে টাকা দিন • ক্যাশ অন ডেলিভারি</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-auto max-w-5xl px-4">
        <div className="border-t border-gray-100" />
      </div>

      {/* Content sections */}
      {content.sections.length > 0 && (
        <div className="mx-auto max-w-3xl px-4 py-10 space-y-12">
          {content.sections.map((s, i) => (
            <Section
              key={i}
              section={s}
              primary={primary}
              accent={accent}
              productName={product.name}
            />
          ))}
        </div>
      )}

      {/* Order form */}
      <div id="order" className="py-14 bg-gray-50">
        <div className="mx-auto max-w-md px-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold" style={{ color: primary }}>
              অর্ডার করুন
            </h2>
            <p className="text-sm text-gray-500 mt-1.5">পণ্য পেয়ে টাকা দিন</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
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

      <StickyOrderButton ctaText={content.ctaText} accentColor={accent} />
    </div>
  );
}
