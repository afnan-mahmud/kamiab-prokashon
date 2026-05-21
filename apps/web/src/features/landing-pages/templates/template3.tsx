'use client';

import { Star, CheckCircle } from 'lucide-react';
import { LandingCheckoutForm } from '../landing-checkout-form';
import type { LandingPage, Product, ContentSection } from '@cholonbil/types';

interface Props { page: LandingPage; product: Product; }

export default function Template3({ page, product }: Props) {
  const { content } = page;
  const primary = content.colors?.primary ?? '#d97706';
  const accent = content.colors?.accent ?? '#4a7c2e';
  const bg = content.colors?.background ?? '#fffbf0';

  const features = content.sections.filter((s): s is Extract<ContentSection, { type: 'features' }> => s.type === 'features').flatMap((s) => s.items);
  const testimonials = content.sections.filter((s): s is Extract<ContentSection, { type: 'testimonial' }> => s.type === 'testimonial').flatMap((s) => s.items);
  const faqs = content.sections.filter((s): s is Extract<ContentSection, { type: 'faq' }> => s.type === 'faq').flatMap((s) => s.items);
  const textSections = content.sections.filter((s): s is Extract<ContentSection, { type: 'text' }> => s.type === 'text');
  const whyProductItems = content.sections.filter((s): s is Extract<ContentSection, { type: 'why_product' }> => s.type === 'why_product').flatMap((s) => s.items);
  const whyUsItems = content.sections.filter((s): s is Extract<ContentSection, { type: 'why_us' }> => s.type === 'why_us').flatMap((s) => s.items);

  return (
    <div style={{ backgroundColor: bg, fontFamily: 'Hind Siliguri, sans-serif' }}>
      {/* Hero — full-width with overlay */}
      <div className="relative overflow-hidden py-20" style={{ background: `linear-gradient(135deg, ${primary}ee 0%, ${primary}99 100%)` }}>
        {content.heroImage?.url && (
          <img src={content.heroImage.url} alt="" className="absolute inset-0 h-full w-full object-cover mix-blend-multiply opacity-30" />
        )}
        <div className="relative mx-auto max-w-3xl px-4 text-center text-white space-y-5">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">{content.heroTitle || product.name}</h1>
          {content.heroSubtitle && <p className="text-lg opacity-90">{content.heroSubtitle}</p>}
          <div className="flex justify-center">
            <a href="#order" className="inline-block rounded-2xl px-10 py-4 text-lg font-bold transition-transform hover:scale-105" style={{ backgroundColor: accent, color: 'white' }}>
              {content.ctaText}
            </a>
          </div>
        </div>
      </div>

      {/* Story / text sections */}
      {textSections.length > 0 && (
        <div className="mx-auto max-w-3xl px-4 py-12 space-y-6">
          {textSections.map((s, i) => (
            <p key={i} className="text-lg text-gray-700 leading-relaxed">{s.content}</p>
          ))}
        </div>
      )}

      {/* Why product section */}
      {whyProductItems.length > 0 && (
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h2 className="text-2xl font-bold text-center mb-6" style={{ color: primary }}>
            কেন খাবেন আমাদের {product.name}?
          </h2>
          <ul className="space-y-3">
            {whyProductItems.map((point, i) => (
              <li key={i} className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm">
                <span className="font-bold text-lg shrink-0" style={{ color: accent }}>✓</span>
                <span className="text-gray-700">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Why buy from us section */}
      {whyUsItems.length > 0 && (
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h2 className="text-2xl font-bold text-center mb-6" style={{ color: primary }}>
            কেন আমাদের থেকে কিনবেন?
          </h2>
          <ul className="space-y-3">
            {whyUsItems.map((point, i) => (
              <li key={i} className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm">
                <span className="font-bold text-lg shrink-0" style={{ color: accent }}>✓</span>
                <span className="text-gray-700">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Features as checkmarks */}
      {features.length > 0 && (
        <div style={{ backgroundColor: primary + '15' }} className="py-12">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="text-2xl font-bold text-center mb-8" style={{ color: primary }}>কেন বেছে নেবেন?</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {features.map((f, i) => (
                <div key={i} className="flex items-start gap-3 bg-white rounded-xl p-4 shadow-sm">
                  <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: accent }} />
                  <div>
                    <p className="font-bold">{f.title}</p>
                    <p className="text-sm text-gray-600">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <div className="py-12 mx-auto max-w-3xl px-4">
          <h2 className="text-2xl font-bold text-center mb-8" style={{ color: primary }}>গ্রাহকদের মতামত</h2>
          <div className="space-y-4">
            {testimonials.map((t, i) => (
              <div key={i} className="rounded-2xl bg-white p-5 shadow-md border-l-4" style={{ borderLeftColor: primary }}>
                <div className="flex gap-0.5 mb-2">{Array.from({ length: t.rating ?? 5 }).map((_, j) => <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />)}</div>
                <p className="text-gray-700 italic mb-3">&ldquo;{t.text}&rdquo;</p>
                <p className="font-bold text-sm" style={{ color: primary }}>— {t.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order form */}
      <div id="order" className="py-16" style={{ backgroundColor: primary + '10' }}>
        <div className="mx-auto max-w-md px-4">
          <div className="rounded-3xl bg-white shadow-xl p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-center mb-6" style={{ color: primary }}>এখনই অর্ডার করুন</h2>
            <LandingCheckoutForm slug={page.slug} product={product} selectedVariantIds={page.selectedVariants} ctaText={content.ctaText} primaryColor={primary} accentColor={accent} />
          </div>
        </div>
      </div>

      {/* FAQs */}
      {faqs.length > 0 && (
        <div className="py-12 mx-auto max-w-2xl px-4">
          <h2 className="text-2xl font-bold text-center mb-8" style={{ color: primary }}>সাধারণ প্রশ্নাবলী</h2>
          <div className="space-y-3">
            {faqs.map((f, i) => (
              <details key={i} className="rounded-xl border border-gray-200 bg-white">
                <summary className="cursor-pointer px-5 py-4 font-semibold list-none">{f.q}</summary>
                <p className="px-5 pb-4 text-sm text-gray-600">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
