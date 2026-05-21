'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useCartStore } from '@/stores/cart.store';
import { formatPrice } from '@/lib/format';
import type { Product } from '@cholonbil/types';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const mainImage = product.images[0];
  const defaultVariant = product.variants.find((v) => v.isDefault) ?? product.variants[0];

  const handleAddToCart = () => {
    if (!defaultVariant) return;
    addItem({
      productId: product._id,
      productName: product.name,
      variantId: defaultVariant._id,
      variantLabel: defaultVariant.label,
      price: defaultVariant.price,
      weight: defaultVariant.weight,
      quantity: 1,
      image: mainImage?.url ?? '',
    });
    toast.success('কার্টে যোগ হয়েছে');
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-card transition-shadow hover:shadow-card-hover">
      {/* Thumbnail */}
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-muted">
          {mainImage?.url ? (
            <Image
              src={mainImage.url}
              alt={mainImage.alt || product.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="flex flex-1 flex-col p-3">
        <Link href={`/products/${product.slug}`}>
          <p className="line-clamp-2 text-sm font-semibold leading-snug text-foreground hover:text-primary">
            {product.name}
          </p>
        </Link>
        <p className="mt-0.5 text-xs text-muted-foreground">{product.category}</p>

        {/* Variant pills */}
        {product.variants.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {product.variants.slice(0, 3).map((v) => (
              <span
                key={v._id}
                className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                {v.label}
              </span>
            ))}
            {product.variants.length > 3 && (
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                +{product.variants.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto pt-3 flex items-center justify-between">
          <span className="text-base font-bold text-primary">
            {defaultVariant ? formatPrice(defaultVariant.price) : '—'}
          </span>
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white transition-colors hover:bg-primary/90 active:scale-95"
            aria-label="কার্টে যোগ করুন"
          >
            <ShoppingCart className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
