'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, ImageIcon } from 'lucide-react';
import { PublicLayout } from '@/components/layout/public-layout';
import { Button } from '@/components/ui/button';
import { useCartStore } from '@/stores/cart.store';
import { formatPrice } from '@/lib/format';

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal } = useCartStore();

  if (items.length === 0) {
    return (
      <PublicLayout>
        <div className="container-page flex flex-col items-center justify-center py-24 text-center">
          <ShoppingBag className="mb-4 h-16 w-16 text-muted-foreground/30" />
          <h1 className="text-xl font-bold">আপনার কার্ট খালি</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            কার্টে কোনো পণ্য নেই। প্রথমে পণ্য যোগ করুন।
          </p>
          <Button asChild className="mt-6">
            <Link href="/shop">পণ্য দেখুন</Link>
          </Button>
        </div>
      </PublicLayout>
    );
  }

  const total = subtotal();

  return (
    <PublicLayout>
      <div className="container-page py-8">
        <h1 className="mb-6 text-2xl font-bold">আমার কার্ট</h1>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Items list */}
          <div className="lg:col-span-2 space-y-3">
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.variantId}`}
                className="flex gap-4 rounded-xl border border-border bg-white p-4 shadow-card"
              >
                {/* Thumbnail */}
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.productName}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold leading-snug">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
                    </div>
                    <button
                      onClick={() => removeItem(item.productId, item.variantId)}
                      className="shrink-0 rounded-full p-1 text-muted-foreground hover:text-destructive"
                      aria-label="সরিয়ে দিন"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    {/* Qty */}
                    <div className="flex items-center rounded-full border border-border">
                      <button
                        onClick={() =>
                          updateQuantity(item.productId, item.variantId, item.quantity - 1)
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-7 text-center text-sm font-medium">{item.quantity}</span>
                      <button
                        onClick={() =>
                          updateQuantity(item.productId, item.variantId, item.quantity + 1)
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-muted"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="font-bold text-primary">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order summary */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border border-border bg-white p-5 shadow-card">
              <h2 className="mb-4 font-bold">অর্ডার সারসংক্ষেপ</h2>

              <div className="space-y-2 text-sm">
                {items.map((item) => (
                  <div
                    key={`${item.productId}-${item.variantId}`}
                    className="flex justify-between text-muted-foreground"
                  >
                    <span className="truncate pr-2">
                      {item.productName} ({item.variantLabel}) × {item.quantity}
                    </span>
                    <span className="shrink-0">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="my-4 border-t border-border" />

              <div className="flex justify-between text-sm text-muted-foreground">
                <span>সাবটোটাল</span>
                <span>{formatPrice(total)}</span>
              </div>
              <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                <span>ডেলিভারি চার্জ</span>
                <span>চেকআউটে নির্ধারিত হবে</span>
              </div>

              <div className="my-4 border-t border-border" />

              <div className="flex justify-between font-bold">
                <span>মোট</span>
                <span className="text-primary">{formatPrice(total)}</span>
              </div>

              <Button asChild className="mt-4 w-full gap-2">
                <Link href="/checkout">
                  চেকআউট করুন
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost" className="mt-2 w-full">
                <Link href="/shop">কেনাকাটা চালিয়ে যান</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
