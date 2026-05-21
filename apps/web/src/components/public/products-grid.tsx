'use client';

import { useQuery } from '@tanstack/react-query';
import { Package } from 'lucide-react';
import { ProductCard } from './product-card';
import { shopApi, type PublicProductFilters } from '@/features/shop/shop.api';

interface ProductsGridProps extends PublicProductFilters {
  emptyMessage?: string;
}

export function ProductsGrid({ emptyMessage = 'কোনো পণ্য পাওয়া যায়নি।', ...filters }: ProductsGridProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['public-products', filters],
    queryFn: () => shopApi.products(filters),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: filters.limit ?? 8 }).map((_, i) => (
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

  const products = data?.data ?? [];

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Package className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}
