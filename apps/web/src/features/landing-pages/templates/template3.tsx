'use client';

import { Star, CheckCircle } from 'lucide-react';
import { LandingCheckoutForm } from '../landing-checkout-form';
import { StickyOrderButton } from '../sticky-order-button';
import { ReviewsCarousel } from './reviews-carousel';
import { HeroMedia } from './hero-media';
import { BookSpecsSection, TocSection, AuthorBioSection, PreviewSection } from './book-sections';
import { fixImageUrl } from '@/lib/image-url';
import type { LandingPage, Product, ContentSection } from '@shukhilife/types';

interface Props {
  page: LandingPage;
  product: Product;
}

export default function Template3({ page, product }: Props) {
  const { content } = page;
  const primary = content.colors?.primary ?? '#0065b3';
  const accent = content.colors?.accent ?? '#8dc53d';
  const bg = content.colors?.background ?? '#fffbf0';

  const features = content.sections
    .filter((s): s is Extract<ContentSection, { type: 'features' }> => s.type === 'features')
    .flatMap((s) => s.items);
  const testimonials = content.sections
    .filter((s): s is Extract<ContentSection, { type: 'testimonial' }> => s.type === 'testimonial')
    .flatMap((s) => s.items);
  const faqs = content.sections
    .filter((s): s is Extract<ContentSection, { type: 'faq' }> => s.type === 'faq')
    .flatMap((s) => s.items);
  const textSections = content.sections.filter(
    (s): s is Extract<ContentSection, { type: 'text' }> => s.type === 'text',
  );
  const whyProductItems = content.sections
    .filter(
      (s): s is Extract<ContentSection, { type: 'why_product' }> => s.type === 'why_product',
    )
    .flatMap((s) => s.items);
  const heroDisplayImage = content.heroImage?.url || product.images?.[0]?.url;
  const hasHeroVideo = content.heroMediaType === 'video' && !!content.heroVideo?.url;

  const whyUsItems = content.sections
    .filter((s): s is Extract<ContentSection, { type: 'why_us' }> => s.type === 'why_us')
    .flatMap((s) => s.items);

  const reviewImages = content.sections
    .filter((s): s is Extract<ContentSection, { type: 'reviews' }> => s.type === 'reviews')
    .flatMap((s) => s.images);

  const bookSpecsSections = content.sections.filter(
    (s): s is Extract<ContentSection, { type: 'book_specs' }> => s.type === 'book_specs',
  );
  const tocSections = content.sections.filter(
    (s): s is Extract<ContentSection, { type: 'toc' }> => s.type === 'toc',
  );
  const authorBioSections = content.sections.filter(
    (s): s is Extract<ContentSection, { type: 'author_bio' }> => s.type === 'author_bio',
  );
  const previewSections = content.sections.filter(
    (s): s is Extract<ContentSection, { type: 'preview' }> => s.type === 'preview',
  );

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
        📚 অরিজিনাল বই • ক্যাশ অন ডেলিভারি • দ্রুত ডেলিভারি
      </div>

      {/* Full-width hero */}
      <div
        className="relative overflow-hidden py-16 sm:py-24"
        style={{
          background: `linear-gradient(150deg, ${primary} 0%, ${primary}cc 60%, ${primary}99 100%)`,
        }}
      >
        {content.heroImage?.url && (
          <img
            src={fixImageUrl(content.heroImage.url)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover mix-blend-multiply opacity-25"
          />
        )}
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white opacity-5 translate-x-32 -translate-y-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white opacity-10 -translate-x-16 translate-y-16" />

        <div className="relative mx-auto max-w-3xl px-4 text-center text-white space-y-5">
          <span className="inline-block rounded-full px-4 py-1.5 text-xs font-semibold bg-white/15 border border-white/30">
            🏆 সেরা মানের অরিজিনাল বই
          </span>

          {/* Circular hero/product media (image or video) */}
          {(hasHeroVideo || heroDisplayImage) && (
            <div className="flex justify-center py-2">
              <div className="relative inline-block">
                <div className="absolute inset-0 rounded-full blur-2xl bg-white opacity-25 scale-125" />
                <HeroMedia
                  content={content}
                  fallbackImage={product.images?.[0]?.url}
                  alt={product.name}
                  className="relative w-32 sm:w-44 h-32 sm:h-44 rounded-full object-cover border-4 border-white/30 shadow-2xl"
                />
              </div>
            </div>
          )}

          <h1 className="text-4xl font-extrabold leading-tight sm:text-5xl lg:text-6xl">
            {content.heroTitle || product.name}
          </h1>
          {content.heroSubtitle && (
            <p className="text-lg opacity-90 leading-relaxed max-w-xl mx-auto">
              {content.heroSubtitle}
            </p>
          )}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href="#order"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl px-10 py-4 text-lg font-bold shadow-xl transition-transform hover:scale-105 active:scale-95"
              style={{ backgroundColor: accent, color: 'white' }}
            >
              {content.ctaText}
              <svg
                className="h-5 w-5"
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
          <p className="text-sm opacity-70">পণ্য পেয়ে টাকা দিন — ক্যাশ অন ডেলিভারি</p>
        </div>
      </div>

      {/* Story / text sections */}
      {textSections.length > 0 && (
        <div className="mx-auto max-w-3xl px-4 py-12 space-y-5">
          {textSections.map((s, i) => (
            <p key={i} className="text-base sm:text-lg text-gray-700 leading-relaxed">
              {s.content}
            </p>
          ))}
        </div>
      )}

      {/* Why product */}
      {whyProductItems.length > 0 && (
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="text-center mb-7">
            <h2 className="text-2xl sm:text-3xl font-extrabold" style={{ color: primary }}>
              কেন পড়বেন এই বইটি?
            </h2>
          </div>
          <div className="space-y-3">
            {whyProductItems.map((point, i) => (
              <div
                key={i}
                className="flex items-start gap-4 rounded-2xl bg-white p-4 shadow-sm border border-gray-100"
              >
                <div
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5"
                  style={{ backgroundColor: accent }}
                >
                  {i + 1}
                </div>
                <span className="text-gray-700 leading-relaxed">{point}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Why us */}
      {whyUsItems.length > 0 && (
        <div style={{ backgroundColor: primary + '10' }} className="py-10">
          <div className="mx-auto max-w-3xl px-4">
            <div className="text-center mb-7">
              <h2 className="text-2xl sm:text-3xl font-extrabold" style={{ color: primary }}>
                কেন আমাদের থেকে কিনবেন?
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {whyUsItems.map((point, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm"
                >
                  <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: accent }} />
                  <span className="text-gray-700 text-sm leading-relaxed">{point}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Features */}
      {features.length > 0 && (
        <div className="py-12">
          <div className="mx-auto max-w-3xl px-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold" style={{ color: primary }}>
                আমাদের বিশেষত্ব
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {features.map((f, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 bg-white rounded-2xl p-5 shadow-md border border-gray-100"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                    style={{ backgroundColor: primary + '15' }}
                  >
                    {f.icon}
                  </div>
                  <div>
                    <p className="font-bold mb-1" style={{ color: primary }}>
                      {f.title}
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <div style={{ backgroundColor: primary + '08' }} className="py-12">
          <div className="mx-auto max-w-3xl px-4">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold" style={{ color: primary }}>
                গ্রাহকদের মতামত
              </h2>
            </div>
            <div className="space-y-4">
              {testimonials.map((t, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white p-5 shadow-md border-l-4"
                  style={{ borderLeftColor: primary }}
                >
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: t.rating ?? 5 }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 italic leading-relaxed mb-4">
                    &ldquo;{t.text}&rdquo;
                  </p>
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: primary }}
                    >
                      {t.name?.charAt(0) ?? '?'}
                    </div>
                    <p className="font-bold text-sm" style={{ color: primary }}>
                      {t.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Review screenshots — গ্রাহকদের মন্তব্য (auto-slide) */}
      {reviewImages.length > 0 && (
        <div className="py-12">
          <div className="mx-auto max-w-3xl px-4">
            <ReviewsCarousel images={reviewImages} primary={primary} />
          </div>
        </div>
      )}

      {/* Order form */}
      <div
        id="order"
        className="py-16"
        style={{
          background: `linear-gradient(135deg, ${primary}15 0%, ${accent}10 100%)`,
        }}
      >
        <div className="mx-auto max-w-md px-4">
          <div className="text-center mb-7">
            <h2 className="text-2xl sm:text-3xl font-extrabold" style={{ color: primary }}>
              এখনই অর্ডার করুন
            </h2>
            <p className="text-sm text-gray-500 mt-1.5">পণ্য পেয়ে টাকা দিন</p>
          </div>
          <div className="rounded-3xl bg-white shadow-2xl p-6 sm:p-8 border border-gray-100">
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

      {/* FAQs */}
      {faqs.length > 0 && (
        <div className="py-12 mx-auto max-w-2xl px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold" style={{ color: primary }}>
              সাধারণ প্রশ্নাবলী
            </h2>
          </div>
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
      )}

      {/* Book-specific sections */}
      {(bookSpecsSections.length > 0 || tocSections.length > 0 || authorBioSections.length > 0 || previewSections.length > 0) && (
        <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
          {bookSpecsSections.map((s, i) => (
            <BookSpecsSection key={i} section={s} product={product} primary={primary} />
          ))}
          {tocSections.map((s, i) => (
            <TocSection key={i} section={s} primary={primary} />
          ))}
          {authorBioSections.map((s, i) => (
            <AuthorBioSection key={i} section={s} primary={primary} />
          ))}
          {previewSections.map((s, i) => (
            <PreviewSection key={i} product={product} primary={primary} title={s.title} />
          ))}
        </div>
      )}

      <StickyOrderButton ctaText={content.ctaText} accentColor={accent} />
    </div>
  );
}
