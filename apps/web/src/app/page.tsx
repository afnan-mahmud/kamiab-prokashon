import Link from 'next/link';
import { ArrowRight, Leaf, Shield, Truck } from 'lucide-react';
import { PublicLayout } from '@/components/layout/public-layout';
import { ProductsGrid } from '@/components/public/products-grid';

const FEATURES = [
  {
    icon: Leaf,
    title: '১০০% অর্গানিক',
    desc: 'কোনো কৃত্রিম রং বা সংরক্ষক ছাড়া',
  },
  {
    icon: Shield,
    title: 'মান নিশ্চিত',
    desc: 'সরাসরি কৃষক থেকে আপনার দরজায়',
  },
  {
    icon: Truck,
    title: 'দ্রুত ডেলিভারি',
    desc: 'ঢাকার ভেতরে ও বাইরে সারা বাংলাদেশে',
  },
];

export default function HomePage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #2d5a1b 0%, #4a7c2e 50%, #6fa14a 100%)',
        }}
      >
        <div className="container-page relative py-20 text-white md:py-28">
          <div className="max-w-xl">
            <span className="mb-4 inline-block rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium">
              🌿 প্রকৃতির সেরা উপহার
            </span>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              সদাই কিনির<br />
              <span className="text-yellow-300">অর্গানিক</span> পণ্য
            </h1>
            <p className="mt-4 text-lg text-white/80">
              সম্পূর্ণ প্রাকৃতিক চাল, মধু, মশলা ও মিষ্টি — কোনো ভেজাল নেই, কোনো রাসায়নিক নেই।
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-accent/90"
              >
                পণ্য দেখুন
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/cart"
                className="inline-flex items-center gap-2 rounded-full border-2 border-white/60 px-6 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                আমার কার্ট
              </Link>
            </div>
          </div>
        </div>
        {/* Decorative circle */}
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }}
        />
      </section>

      {/* Features strip */}
      <section className="border-b border-border bg-white">
        <div className="container-page grid gap-6 py-8 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{f.title}</p>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Best Sellers */}
      <section className="container-page py-12">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold">বেস্ট সেলিং পণ্য</h2>
            <p className="mt-1 text-sm text-muted-foreground">আমাদের সবচেয়ে জনপ্রিয় পণ্যগুলো</p>
          </div>
          <Link href="/shop" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            সব দেখুন <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <ProductsGrid sort="popular" limit={8} />
      </section>

      {/* All Products */}
      <section className="bg-muted/30 py-12">
        <div className="container-page">
          <div className="mb-8">
            <h2 className="text-2xl font-bold">সকল পণ্য</h2>
            <p className="mt-1 text-sm text-muted-foreground">আমাদের সম্পূর্ণ সংগ্রহ</p>
          </div>
          <ProductsGrid limit={12} />
          <div className="mt-8 text-center">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 rounded-full border-2 border-primary px-8 py-3 font-semibold text-primary transition hover:bg-primary hover:text-white"
            >
              সব পণ্য দেখুন <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
