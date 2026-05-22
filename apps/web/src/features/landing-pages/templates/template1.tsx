'use client';

import { Star, ShieldCheck, Truck, PhoneCall } from 'lucide-react';
import { LandingCheckoutForm } from '../landing-checkout-form';
import { StickyOrderButton } from '../sticky-order-button';
import { fixImageUrl } from '@/lib/image-url';
import type { LandingPage, Product, ContentSection } from '@cholonbil/types';

interface Props {
  page: LandingPage;
  product: Product;
}

function SectionRenderer({
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
        <p className="text-base sm:text-lg leading-relaxed text-gray-700 whitespace-pre-line">
          {section.content}
        </p>
      );
    case 'image':
      return (
        <div className="overflow-hidden rounded-2xl shadow-lg">
          <img src={fixImageUrl(section.url)} alt={section.alt} className="w-full object-cover" />
        </div>
      );
    case 'video':
      return (
        <div className="aspect-video overflow-hidden rounded-2xl shadow-lg">
          <iframe src={section.embedUrl} className="h-full w-full" allowFullScreen />
        </div>
      );
    case 'features':
      return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {section.items.map((item, i) => (
            <div
              key={i}
              className="rounded-2xl bg-white p-5 shadow-md border border-gray-100 hover:shadow-lg transition-shadow"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-3"
                style={{ backgroundColor: primary + '15' }}
              >
                {item.icon}
              </div>
              <h3 className="font-bold text-gray-900 mb-1.5">{item.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      );
    case 'testimonial':
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          {section.items.map((item, i) => (
            <div key={i} className="relative rounded-2xl bg-white p-5 shadow-md border border-gray-100">
              <div
                className="text-5xl font-serif leading-none absolute -top-2 left-4 select-none opacity-20"
                style={{ color: primary }}
              >
                &ldquo;
              </div>
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: item.rating ?? 5 }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed mb-4 italic">{item.text}</p>
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: primary }}
                >
                  {item.name?.charAt(0) ?? '?'}
                </div>
                <p className="font-semibold text-sm">{item.name}</p>
              </div>
            </div>
          ))}
        </div>
      );
    case 'faq':
      return (
        <div className="space-y-3">
          {section.items.map((item, i) => (
            <details
              key={i}
              className="group rounded-2xl border border-gray-200 bg-white overflow-hidden"
            >
              <summary className="cursor-pointer px-5 py-4 font-semibold text-gray-900 list-none flex items-center justify-between gap-3 select-none">
                <span className="flex-1">{item.q}</span>
                <span
                  className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white text-xl font-light"
                  style={{ backgroundColor: primary }}
                >
                  +
                </span>
              </summary>
              <p className="px-5 pb-5 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-4">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      );
    case 'why_product':
      return (
        <div className="rounded-2xl overflow-hidden shadow-md">
          <div className="px-6 py-4" style={{ backgroundColor: primary }}>
            <h2 className="text-lg font-bold text-white">কেন খাবেন আমাদের {productName}?</h2>
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
    case 'why_us':
      return (
        <div className="rounded-2xl overflow-hidden shadow-md">
          <div className="px-6 py-4" style={{ backgroundColor: accent }}>
            <h2 className="text-lg font-bold text-white">কেন আমাদের থেকে কিনবেন?</h2>
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
    default:
      return null;
  }
}

export default function Template1({ page, product }: Props) {
  const { content } = page;
  const primary = content.colors?.primary ?? '#4a7c2e';
  const accent = content.colors?.accent ?? '#d97706';
  const bg = content.colors?.background ?? '#fefcf7';
  const heroDisplayImage = content.heroImage?.url || product.images?.[0]?.url;

  return (
    <div
      style={{ backgroundColor: bg, fontFamily: 'Hind Siliguri, sans-serif' }}
      className="pb-20 md:pb-0"
    >
      {/* Announcement bar */}
      <div
        className="text-center py-2 px-4 text-xs sm:text-sm font-medium text-white"
        style={{ backgroundColor: accent }}
      >
        🌿 ১০০% অর্গানিক &nbsp;•&nbsp; বিশ্বস্ত ব্র্যান্ড &nbsp;•&nbsp; দ্রুত ডেলিভারি
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden" style={{ backgroundColor: primary }}>
        {content.heroImage?.url && (
          <img
            src={fixImageUrl(content.heroImage.url)}
            alt="Hero"
            className="absolute inset-0 h-full w-full object-cover opacity-20"
          />
        )}
        {/* Hero background (faded) */}
        {content.heroImage?.url && (
          <img
            src={fixImageUrl(content.heroImage.url)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-15"
          />
        )}
        {/* Decorative blobs */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white opacity-10" />
        <div
          className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full opacity-10"
          style={{ backgroundColor: accent }}
        />

        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:py-20">
          <div className="grid gap-8 lg:grid-cols-2 items-center">
            {/* Left: text */}
            <div className="text-white space-y-5">
              <span
                className="inline-block rounded-full px-4 py-1.5 text-xs font-semibold border border-white/30"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
              >
                🌱 প্রিমিয়াম কোয়ালিটি
              </span>
              <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
                {content.heroTitle || product.name}
              </h1>
              {content.heroSubtitle && (
                <p className="text-base sm:text-lg opacity-90 leading-relaxed">
                  {content.heroSubtitle}
                </p>
              )}
              {/* Trust badges */}
              <div className="flex flex-wrap gap-2">
                {[
                  { icon: <ShieldCheck className="h-3.5 w-3.5" />, text: '১০০% অর্গানিক' },
                  { icon: <Truck className="h-3.5 w-3.5" />, text: 'দ্রুত ডেলিভারি' },
                  { icon: <PhoneCall className="h-3.5 w-3.5" />, text: 'COD সুবিধা' },
                ].map((b, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border border-white/20"
                    style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
                  >
                    {b.icon} {b.text}
                  </div>
                ))}
              </div>
              <a
                href="#order"
                className="inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-bold shadow-xl transition-transform hover:scale-105 active:scale-95"
                style={{ backgroundColor: accent, color: 'white' }}
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

            {/* Right: hero/product image */}
            {heroDisplayImage && (
              <div className="flex justify-center lg:justify-end">
                <div className="relative">
                  <div
                    className="absolute inset-0 rounded-3xl blur-2xl opacity-40 scale-110"
                    style={{ backgroundColor: accent }}
                  />
                  <img
                    src={fixImageUrl(heroDisplayImage)}
                    alt={product.name}
                    className="relative w-60 sm:w-72 lg:w-80 rounded-3xl shadow-2xl object-cover aspect-square"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content sections */}
      {content.sections.length > 0 && (
        <div className="mx-auto max-w-4xl px-4 py-12 space-y-10">
          {content.sections.map((section, i) => (
            <SectionRenderer
              key={i}
              section={section}
              primary={primary}
              accent={accent}
              productName={product.name}
            />
          ))}
        </div>
      )}

      {/* Order form */}
      <div
        id="order"
        className="py-14"
        style={{
          background: `linear-gradient(135deg, ${primary}14 0%, ${accent}10 100%)`,
        }}
      >
        <div className="mx-auto max-w-md px-4">
          <div className="text-center mb-7">
            <span
              className="inline-block rounded-full px-4 py-1 text-xs font-semibold text-white mb-3"
              style={{ backgroundColor: accent }}
            >
              সহজ অর্ডার প্রক্রিয়া
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold" style={{ color: primary }}>
              এখনই অর্ডার করুন
            </h2>
            <p className="text-sm text-gray-500 mt-1.5">
              পণ্য পেয়ে টাকা দিন — কোনো অ্যাডভান্স নেই
            </p>
          </div>
          <div className="rounded-3xl bg-white shadow-2xl border border-gray-100 p-6 sm:p-8">
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
