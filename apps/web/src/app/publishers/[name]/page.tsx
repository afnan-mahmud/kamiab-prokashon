'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Loader2, Building2 } from 'lucide-react';
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

export default function PublisherPage() {
  const params = useParams();
  const name = safeDecode(String(params?.['name'] ?? ''));

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-publisher', name],
    queryFn: () => shopApi.publisher(name),
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
          <p className="text-lg font-medium">প্রকাশনী পাওয়া যায়নি</p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/shop">পণ্য তালিকায় ফিরুন</Link>
          </Button>
        </div>
      </PublicLayout>
    );
  }

  const { publisher, products } = data;

  return (
    <PublicLayout>
      <div className="container-page py-6">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">হোম</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/shop" className="hover:text-foreground">পণ্যসমূহ</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{publisher.name}</span>
        </nav>

        {/* Publisher header */}
        <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-border bg-white p-5 sm:flex-row sm:items-start">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-border bg-muted">
            {publisher.image?.url ? (
              <Image src={publisher.image.url} alt={publisher.name} fill className="object-contain" sizes="96px" />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Building2 className="h-8 w-8 text-muted-foreground/40" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">প্রকাশনী</p>
            <h1 className="mt-0.5 text-2xl font-bold leading-snug">{publisher.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {toBengali(products.length)}টি বই
            </p>
            {publisher.bio && (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {publisher.bio}
              </p>
            )}
          </div>
        </div>

        {/* Books */}
        <h2 className="mb-4 text-xl font-bold">এই প্রকাশনীর বইসমূহ</h2>
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
