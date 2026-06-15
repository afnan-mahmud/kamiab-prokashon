'use client';

import Link from 'next/link';
import { ArrowRight, BookOpen, HandCoins, Truck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PublicLayout } from '@/components/layout/public-layout';
import { ProductCard } from '@/components/public/product-card';
import { HeroCarousel } from '@/components/public/hero-carousel';
import { shopApi } from '@/features/shop/shop.api';

const FEATURES = [
  {
    icon: BookOpen,
    title: 'অরিজিনাল বই',
    desc: 'সরাসরি প্রকাশক থেকে প্রামাণিক ইসলামী গ্রন্থ',
  },
  {
    icon: HandCoins,
    title: 'ক্যাশ অন ডেলিভারি',
    desc: 'বই হাতে পেয়ে পেমেন্ট করুন — নিরাপদ ও সহজ',
  },
  {
    icon: Truck,
    title: 'দ্রুত ডেলিভারি',
    desc: 'ঢাকার ভেতরে ও সারা বাংলাদেশে দ্রুত পৌঁছে দেই',
  },
];

const SKELETON_COUNT = 12;

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-2xl border border-border bg-white">
          <div className="aspect-square rounded-t-2xl bg-muted" />
          <div className="space-y-2 p-3">
            <div className="h-3 w-3/4 rounded bg-muted" />
            <div className="h-3 w-1/2 rounded bg-muted" />
            <div className="h-8 w-full rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const { data: bannerData } = useQuery({
    queryKey: ['home-banners'],
    queryFn: () => shopApi.banners(),
    staleTime: 5 * 60_000,
  });

  const { data: newData, isLoading: newLoading } = useQuery({
    queryKey: ['home-new'],
    queryFn: () => shopApi.products({ sort: 'newest', limit: 12 }),
    staleTime: 60_000,
  });

  const { data: bestData, isLoading: bestLoading } = useQuery({
    queryKey: ['home-bestsellers'],
    queryFn: () => shopApi.products({ sort: 'popular', limit: 12 }),
    staleTime: 60_000,
  });

  const newBooks = newData?.data ?? [];
  const bestBooks = bestData?.data ?? [];

  return (
    <PublicLayout>
      {/* Hero carousel */}
      <HeroCarousel banners={bannerData ?? []} />

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

      {/* New arrivals */}
      <section className="container-page py-12">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold">নতুন বই</h2>
            <p className="mt-1 text-sm text-muted-foreground">সদ্য যোগ হওয়া বইগুলো</p>
          </div>
          <Link href="/shop" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            সব দেখুন <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {newLoading ? (
          <ProductGridSkeleton />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {newBooks.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Best sellers */}
      <section className="bg-muted/30 py-12">
        <div className="container-page">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold">বেস্ট সেলিং বই</h2>
              <p className="mt-1 text-sm text-muted-foreground">পাঠকদের সবচেয়ে পছন্দের বইগুলো</p>
            </div>
            <Link href="/shop" className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              সব দেখুন <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {bestLoading ? (
            <ProductGridSkeleton />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {bestBooks.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
