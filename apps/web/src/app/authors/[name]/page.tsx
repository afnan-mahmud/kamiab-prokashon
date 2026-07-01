'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Loader2, PenLine } from 'lucide-react';
import { PublicLayout } from '@/components/layout/public-layout';
import { ProductCard } from '@/components/public/product-card';
import { Button } from '@/components/ui/button';
import { shopApi } from '@/features/shop/shop.api';
import { toBengali } from '@/lib/format';

function safeDecode(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export default function AuthorPage() {
  const params = useParams();
  const name = safeDecode(String(params?.['name'] ?? ''));

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-author', name],
    queryFn: () => shopApi.author(name),
    enabled: !!name,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="container-page flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </PublicLayout>
    );
  }

  if (error || !data) {
    return (
      <PublicLayout>
        <div className="container-page py-20 text-center">
          <p className="text-lg font-medium">লেখক পাওয়া যায়নি</p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/shop">পণ্য তালিকায় ফিরুন</Link>
          </Button>
        </div>
      </PublicLayout>
    );
  }

  const { author, products } = data;

  return (
    <PublicLayout>
      <div className="container-page py-6">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">হোম</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/shop" className="hover:text-foreground">পণ্যসমূহ</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{author.name}</span>
        </nav>

        {/* Author header */}
        <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-border bg-white p-5 sm:flex-row sm:items-start">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
            {author.image?.url ? (
              <Image src={author.image.url} alt={author.name} fill className="object-cover" sizes="96px" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <PenLine className="h-8 w-8 text-muted-foreground/40" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">লেখক</p>
            <h1 className="mt-0.5 text-2xl font-bold leading-snug">{author.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {toBengali(products.length)}টি বই
            </p>
            {author.bio && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {author.bio}
              </p>
            )}
          </div>
        </div>

        {/* Books */}
        <h2 className="mb-4 text-xl font-bold">এই লেখকের বইসমূহ</h2>
        {products.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">কোনো বই পাওয়া যায়নি।</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
