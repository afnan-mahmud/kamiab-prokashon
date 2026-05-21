'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { PublicLayout } from '@/components/layout/public-layout';
import { ProductCard } from '@/components/public/product-card';
import { shopApi } from '@/features/shop/shop.api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SORT_OPTIONS = [
  { value: 'newest', label: 'নতুন আগে' },
  { value: 'popular', label: 'জনপ্রিয়' },
  { value: 'price_asc', label: 'দাম: কম থেকে বেশি' },
  { value: 'price_desc', label: 'দাম: বেশি থেকে কম' },
];

export default function ShopPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ['public-categories'],
    queryFn: () => shopApi.categories(),
    staleTime: 5 * 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['public-products', { page, search, category, sort }],
    queryFn: () =>
      shopApi.products({
        page,
        limit: 12,
        search: search || undefined,
        category: category || undefined,
        sort,
      }),
    staleTime: 30_000,
  });

  const products = data?.data ?? [];
  const pagination = data?.pagination;

  const applySearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch('');
    setSearchInput('');
    setCategory('');
    setSort('newest');
    setPage(1);
  };

  const hasFilters = search || category || sort !== 'newest';

  return (
    <PublicLayout>
      {/* Page header */}
      <div className="border-b border-border bg-white">
        <div className="container-page py-6">
          <h1 className="text-2xl font-bold">সকল পণ্য</h1>
          {pagination && (
            <p className="mt-1 text-sm text-muted-foreground">
              মোট {pagination.total} টি পণ্য পাওয়া গেছে
            </p>
          )}
        </div>
      </div>

      <div className="container-page py-6">
        {/* Search + Sort bar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="পণ্য খুঁজুন..."
              className="pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            />
          </div>
          <Button variant="outline" onClick={applySearch}>
            খুঁজুন
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowFilters((v) => !v)}
            className="gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            ফিল্টার
          </Button>
          {hasFilters && (
            <Button variant="ghost" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
              <X className="h-3.5 w-3.5" />
              ক্লিয়ার
            </Button>
          )}
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="mb-4 rounded-lg border border-border bg-white p-4">
            <div className="flex flex-wrap gap-4">
              {/* Category */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">বিভাগ</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { setCategory(''); setPage(1); }}
                    className={cn(
                      'rounded-full border px-3 py-1 text-sm transition-colors',
                      !category
                        ? 'border-primary bg-primary text-white'
                        : 'border-border hover:border-primary/50',
                    )}
                  >
                    সব
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => { setCategory(cat); setPage(1); }}
                      className={cn(
                        'rounded-full border px-3 py-1 text-sm transition-colors',
                        category === cat
                          ? 'border-primary bg-primary text-white'
                          : 'border-border hover:border-primary/50',
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              {/* Sort */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">সাজানো</p>
                <div className="flex flex-wrap gap-2">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setSort(opt.value); setPage(1); }}
                      className={cn(
                        'rounded-full border px-3 py-1 text-sm transition-colors',
                        sort === opt.value
                          ? 'border-primary bg-primary text-white'
                          : 'border-border hover:border-primary/50',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {hasFilters && (
          <div className="mb-4 flex flex-wrap gap-2">
            {search && (
              <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                খুঁজছেন: {search}
                <button onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {category && (
              <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                বিভাগ: {category}
                <button onClick={() => { setCategory(''); setPage(1); }}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Product grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
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
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">কোনো পণ্য পাওয়া যায়নি</p>
            <p className="mt-1 text-sm text-muted-foreground">
              অন্য ফিল্টার ব্যবহার করে দেখুন
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === pagination.totalPages || Math.abs(p - page) <= 1)
              .map((p, idx, arr) => (
                <span key={p} className="flex items-center gap-1">
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className="text-muted-foreground">…</span>
                  )}
                  <button
                    onClick={() => setPage(p)}
                    className={cn(
                      'h-8 w-8 rounded-md text-sm font-medium transition-colors',
                      p === page
                        ? 'bg-primary text-white'
                        : 'hover:bg-muted text-muted-foreground',
                    )}
                  >
                    {p}
                  </button>
                </span>
              ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page === pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
