'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { PublicLayout } from '@/components/layout/public-layout';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ProductCard } from '@/components/public/product-card';
import { BookPreviewModal } from '@/components/public/book-preview-modal';
import { shopApi } from '@/features/shop/shop.api';
import { useCartStore } from '@/stores/cart.store';
import { formatPrice, toBengali, discountPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import { fireEvent } from '@/lib/pixel';
import { gtmViewItem, gtmAddToCart } from '@/lib/gtm';
import type { CategoryNode } from '@kamiab/types';

function buildSlugNameMap(nodes: CategoryNode[]): Map<string, string> {
  const map = new Map<string, string>();
  const traverse = (items: CategoryNode[]) => {
    for (const node of items) {
      map.set(node.slug, node.name);
      if (node.children.length > 0) traverse(node.children);
    }
  };
  traverse(nodes);
  return map;
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product-detail', slug],
    queryFn: () => shopApi.product(slug),
    enabled: !!slug,
  });

  const { data: suggested = [] } = useQuery({
    queryKey: ['suggested-products', product?._id],
    queryFn: () => shopApi.suggested(product?._id, 5),
    enabled: !!product?._id,
    staleTime: 60_000,
  });

  const { data: categoryTree = [] } = useQuery({
    queryKey: ['public-category-tree'],
    queryFn: () => shopApi.categoryTree(),
    staleTime: 5 * 60_000,
  });

  const categoryNameMap = buildSlugNameMap(categoryTree);

  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [orderPopupOpen, setOrderPopupOpen] = useState(false);

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
    gtmViewItem({
      item_id: product._id,
      item_name: product.name,
      item_category: product.category,
      item_variant: defaultVariant?.label,
      price: defaultVariant?.price ?? 0,
      quantity: 1,
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
      customDelivery:
        product.customDeliveryEnabled && selectedVariant.customDelivery
          ? selectedVariant.customDelivery
          : null,
    });
    fireEvent('AddToCart', {
      content_ids: [product._id],
      content_name: product.name,
      content_type: 'product',
      value: selectedVariant.price * qty,
      currency: 'BDT',
      num_items: qty,
    });
    gtmAddToCart({
      item_id: product._id,
      item_name: product.name,
      item_category: product.category,
      item_variant: selectedVariant.label,
      price: selectedVariant.price,
      quantity: qty,
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

  const discount = discountPercent(selectedVariant?.regularPrice, selectedVariant?.price);
  const hasPreview = (product.previewImages?.length ?? 0) > 0 || !!product.previewPdf;

  // Build specs rows — only present fields
  const specs: { label: string; value: string }[] = [
    product.author ? { label: 'লেখক', value: product.author } : null,
    product.publisher ? { label: 'প্রকাশনী', value: product.publisher } : null,
    product.translator ? { label: 'অনুবাদক', value: product.translator } : null,
    product.pages ? { label: 'পৃষ্ঠা', value: toBengali(product.pages) } : null,
    product.language ? { label: 'ভাষা', value: product.language } : null,
    product.binding ? { label: 'বাঁধাই', value: product.binding } : null,
    product.edition ? { label: 'সংস্করণ', value: product.edition } : null,
    product.isbn ? { label: 'ISBN', value: product.isbn } : null,
    product.publicationYear ? { label: 'প্রকাশকাল', value: toBengali(product.publicationYear) } : null,
  ].filter((row): row is { label: string; value: string } => row !== null);

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
          {/* Image gallery — book cover aspect ratio */}
          <div className="space-y-3">
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl border border-border bg-muted">
              {activeImage?.url ? (
                <Image
                  src={activeImage.url}
                  alt={activeImage.alt || product.name}
                  fill
                  className="object-contain"
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

            {/* Preview button */}
            {hasPreview && (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setPreviewOpen(true)}
              >
                <BookOpen className="h-4 w-4" />
                একটু পড়ে দেখুন
              </Button>
            )}
          </div>

          {/* Product info */}
          <div className="space-y-5">
            <div>
              <p className="text-sm text-muted-foreground">{categoryNameMap.get(product.category) ?? product.category}</p>
              <h1 className="mt-1 text-2xl font-bold leading-snug">{product.name}</h1>
              {(product.author || product.publisher) && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {product.author && <span>লেখক: {product.author}</span>}
                  {product.author && product.publisher && <span> · </span>}
                  {product.publisher && <span>প্রকাশনী: {product.publisher}</span>}
                </p>
              )}

              {/* Price block */}
              {selectedVariant && (
                <div className="mt-3 flex items-baseline gap-3">
                  <p className="text-3xl font-bold text-primary">
                    {formatPrice(selectedVariant.price)}
                  </p>
                  {discount !== null && selectedVariant.regularPrice && (
                    <>
                      <p className="text-lg text-muted-foreground line-through">
                        {formatPrice(selectedVariant.regularPrice)}
                      </p>
                      <span className="rounded bg-accent px-2 py-0.5 text-sm font-semibold text-white">
                        -{toBengali(discount)}%
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Variants — only when more than 1 */}
            {product.variants.length > 1 && (
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

            {/* CTAs */}
            <div className="flex flex-col gap-3 sm:flex-row">
              {/* Primary: order now → add to cart + open popup */}
              <Button
                size="lg"
                className="flex-1 gap-2"
                onClick={() => {
                  handleAddToCart();
                  setOrderPopupOpen(true);
                }}
                disabled={!inStock}
              >
                {inStock ? 'অর্ডার করুন' : 'স্টক নেই'}
              </Button>
              {/* Secondary: just add to cart, toast fires in handleAddToCart */}
              {inStock && (
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="h-5 w-5" />
                  কার্টে যোগ করুন
                </Button>
              )}
            </div>

            {/* Specs table */}
            {specs.length > 0 && (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    {specs.map(({ label, value }) => (
                      <tr key={label} className="border-b border-border last:border-0">
                        <td className="w-1/3 bg-muted/50 px-4 py-2.5 font-medium text-muted-foreground">
                          {label}
                        </td>
                        <td className="px-4 py-2.5">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

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

        {/* Suggested / best-selling products */}
        {suggested.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-xl font-bold">এই পণ্যগুলো জনপ্রিয়</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {suggested.slice(0, 5).map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Book preview modal */}
      <BookPreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        images={product.previewImages}
        pdf={product.previewPdf}
        title={product.name}
      />

      {/* Order added popup */}
      <Dialog open={orderPopupOpen} onOpenChange={setOrderPopupOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>বইটি কার্টে যোগ হয়েছে</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{product.name}</p>
          <DialogFooter className="mt-2 gap-2">
            <Button
              variant="outline"
              onClick={() => setOrderPopupOpen(false)}
            >
              আরও বই দেখুন
            </Button>
            <Button onClick={() => router.push('/checkout')}>
              চেকআউট করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PublicLayout>
  );
}
