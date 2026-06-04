'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { landingPagesApi } from '@/features/landing-pages/landing-pages.api';
import type { Product } from '@shukhilife/types';
import { fireEvent } from '@/lib/pixel';
import { gtmViewItem } from '@/lib/gtm';

// Lazy-load templates to keep initial bundle small
const Template1 = dynamic(() => import('@/features/landing-pages/templates/template1'));
const Template2 = dynamic(() => import('@/features/landing-pages/templates/template2'));
const Template3 = dynamic(() => import('@/features/landing-pages/templates/template3'));
const Template4 = dynamic(() => import('@/features/landing-pages/templates/template4'));

export default function LandingPagePublicRenderer() {
  const { slug } = useParams<{ slug: string }>();

  const { data: page, isLoading, isError } = useQuery({
    queryKey: ['lp', slug],
    queryFn: () => landingPagesApi.getPublic(slug),
    enabled: !!slug,
    staleTime: 60_000,
  });

  const product = page?.product as unknown as Product | undefined;

  useEffect(() => {
    if (!page || !product) return;
    const defaultVariant =
      product.variants.find((v) => v.isDefault) ?? product.variants[0];
    fireEvent('ViewContent', {
      content_ids: [String((product as unknown as { _id: string })._id ?? '')],
      content_name: product.name,
      content_type: 'product',
      value: defaultVariant?.price ?? 0,
      currency: 'BDT',
    });
    gtmViewItem({
      item_id: String((product as unknown as { _id: string })._id ?? ''),
      item_name: product.name,
      item_category: product.category,
      item_variant: defaultVariant?.label,
      price: defaultVariant?.price ?? 0,
      quantity: 1,
    });
  }, [page?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !page) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
        <p className="text-2xl font-bold">পেজটি পাওয়া যায়নি</p>
        <p className="text-muted-foreground">এই লিঙ্কটি আর সক্রিয় নেই অথবা ভুল।</p>
      </div>
    );
  }

  const templateProps = { page, product: product! };

  return (
    <>
      {page.template === 'template1' && <Template1 {...templateProps} />}
      {page.template === 'template2' && <Template2 {...templateProps} />}
      {page.template === 'template3' && <Template3 {...templateProps} />}
      {page.template === 'template4' && <Template4 {...templateProps} />}
    </>
  );
}
