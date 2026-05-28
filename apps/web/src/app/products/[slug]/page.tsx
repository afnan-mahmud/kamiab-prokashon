'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingCart,
  Minus,
  Plus,
  ChevronRight,
  ImageIcon,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { PublicLayout } from '@/components/layout/public-layout';
import { Button } from '@/components/ui/button';
import { shopApi } from '@/features/shop/shop.api';
import { useCartStore } from '@/stores/cart.store';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';
import { fireEvent } from '@/lib/pixel';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const addItem = useCartStore((s) => s.addItem);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product-detail', slug],
    queryFn: () => shopApi.product(slug),
    enabled: !!slug,
  });

  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [qty, setQty] = useState(1);

  const selectedVariant =
    product?.variants.find((v) => v._id === selectedVariantId) ??
    product?.variants.find((v) => v.isDefault) ??
    product?.variants[0];

  useEffect(() => {
    if (!product) return;
    const defaultVariant =
      product.variants.find((v) => v.isDefault) ?? product.variants[0];
    fireEvent('ViewContent', {
      content_ids: [product._id],
      content_name: product.name,
      content_type: 'product',
      value: defaultVariant?.price ?? 0,
      currency: 'BDT',
    });
  }, [product?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAddToCart = () => {
    if (!product || !selectedVariant) return;
    addItem({
      productId: product._id,
      productName: product.name,
      variantId: selectedVariant._id,
      variantLabel: selectedVariant.label,
      price: selectedVariant.price,
      weight: selectedVariant.weight,
      quantity: qty,
      image: product.images[0]?.url ?? '',
    });
    fireEvent('AddToCart', {
      content_ids: [product._id],
      content_name: product.name,
      content_type: 'product',
      value: selectedVariant.price * qty,
      currency: 'BDT',
      num_items: qty,
    });
    toast.success(`${qty} টি কার্টে যোগ হয়েছে`);
  };

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PublicLayout>
    );
  }

  if (error || !product) {
    return (
      <PublicLayout>
        <div className="container-page py-20 text-center">
          <p className="text-lg font-medium">পণ্যটি পাওয়া যায়নি</p>
          <Button asChild className="mt-4" variant="outline">
            <Link href="/shop">পণ্য তালিকায় ফিরুন</Link>
          </Button>
        </div>
      </PublicLayout>
    );
  }

  const activeImage = product.images[activeImageIdx];
  const inStock =
    selectedVariant !== undefined &&
    (product?.poolStock ?? 0) >= selectedVariant.weight * qty;

  return (
    <PublicLayout>
      <div className="container-page py-6">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">হোম</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/shop" className="hover:text-foreground">পণ্যসমূহ</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">{product.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Image gallery */}
          <div className="space-y-3">
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted">
              {activeImage?.url ? (
                <Image
                  src={activeImage.url}
                  alt={activeImage.alt || product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <ImageIcon className="h-16 w-16 text-muted-foreground/30" />
                </div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIdx(idx)}
                    className={cn(
                      'relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors',
                      idx === activeImageIdx
                        ? 'border-primary'
                        : 'border-border hover:border-primary/50',
                    )}
                  >
                    {img.url ? (
                      <Image
                        src={img.url}
                        alt={img.alt || `Image ${idx + 1}`}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-muted">
                        <ImageIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="space-y-5">
            <div>
              <p className="text-sm text-muted-foreground">{product.category}</p>
              <h1 className="mt-1 text-2xl font-bold leading-snug">{product.name}</h1>
              {selectedVariant && (
                <p className="mt-2 text-3xl font-bold text-primary">
                  {formatPrice(selectedVariant.price)}
                </p>
              )}
            </div>

            {/* Variants */}
            {product.variants.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold">পরিমাণ / ভ্যারিয়েন্ট</p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v) => (
                    <button
                      key={v._id}
                      onClick={() => setSelectedVariantId(v._id)}
                      className={cn(
                        'rounded-full border px-4 py-2 text-sm font-medium transition-colors',
                        (selectedVariant?._id === v._id)
                          ? 'border-primary bg-primary text-white'
                          : 'border-border hover:border-primary',
                      )}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
                {selectedVariant && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    ওজন: {selectedVariant.weight} কেজি
                  </p>
                )}
              </div>
            )}

            {/* Quantity selector */}
            <div>
              <p className="mb-2 text-sm font-semibold">পরিমাণ</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center rounded-full border border-border">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-medium">{qty}</span>
                  <button
                    onClick={() =>
                      setQty((q) => {
                        const next = q + 1;
                        return product && selectedVariant && product.poolStock >= selectedVariant.weight * next
                          ? next
                          : q;
                      })
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="flex-1 gap-2"
                onClick={handleAddToCart}
                disabled={!inStock}
              >
                <ShoppingCart className="h-5 w-5" />
                {inStock ? 'কার্টে যোগ করুন' : 'স্টক নেই'}
              </Button>
              {inStock && (
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    handleAddToCart();
                    window.location.href = '/checkout';
                  }}
                >
                  এখনই অর্ডার করুন
                </Button>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="mb-2 text-sm font-semibold">পণ্যের বিবরণ</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
