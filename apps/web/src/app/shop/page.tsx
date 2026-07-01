'use client';

import { Suspense, useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { PublicLayout } from '@/components/layout/public-layout';
import { ProductCard } from '@/components/public/product-card';
import { shopApi } from '@/features/shop/shop.api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { CategoryNode } from '@kamiab/types';

const SORT_OPTIONS = [
  { value: 'newest', label: 'নতুন আগে' },
  { value: 'popular', label: 'জনপ্রিয়' },
  { value: 'price_asc', label: 'দাম: কম→বেশি' },
  { value: 'price_desc', label: 'দাম: বেশি→কম' },
];

// Build a flat slug→name map recursively from the category tree
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

// Recursive nested category list for sidebar / slide-over
function CategoryList({
  nodes,
  activeSlug,
  onSelect,
  depth = 0,
}: {
  nodes: CategoryNode[];
  activeSlug: string;
  onSelect: (slug: string) => void;
  depth?: number;
}) {
  return (
    <>
      {nodes.map((node) => (
        <div key={node._id}>
          <button
            onClick={() => onSelect(node.slug)}
            className={cn(
              'w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors',
              depth > 0 && 'pl-6',
              activeSlug === node.slug
                ? 'bg-primary text-white font-medium'
                : 'hover:bg-muted text-foreground',
            )}
          >
            {node.name}
          </button>
          {node.children.length > 0 && (
            <CategoryList
              nodes={node.children}
              activeSlug={activeSlug}
              onSelect={onSelect}
              depth={depth + 1}
            />
          )}
        </div>
      ))}
    </>
  );
}

// Loading skeleton (reused from original)
function ProductGridSkeleton() {
  return (
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
  );
}

function ShopContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initialise from URL
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [searchInput, setSearchInput] = useState(searchParams.get('search') ?? '');
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'newest');
  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');
  const [minPrice, setMinPrice] = useState<number | undefined>(undefined);
  const [maxPrice, setMaxPrice] = useState<number | undefined>(undefined);
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  // Sync local state when URL params change (e.g. navigating to /shop?search=... from the header)
  useEffect(() => {
    const paramSearch = searchParams.get('search') ?? '';
    const paramCategory = searchParams.get('category') ?? '';
    const paramSort = searchParams.get('sort') ?? 'newest';
    if (paramSearch !== search) {
      setSearch(paramSearch);
      setSearchInput(paramSearch);
      setPage(1);
    }
    if (paramCategory !== category) {
      setCategory(paramCategory);
      setPage(1);
    }
    if (paramSort !== sort) {
      setSort(paramSort);
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Sync URL when key filter state changes
  const pushParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v) params.set(k, v);
        else params.delete(k);
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const { data: categoryTree = [] } = useQuery({
    queryKey: ['public-category-tree'],
    queryFn: () => shopApi.categoryTree(),
    staleTime: 5 * 60_000,
  });

  const slugNameMap = buildSlugNameMap(categoryTree);

  const { data, isLoading } = useQuery({
    queryKey: ['public-products', { page, search, category, sort, minPrice, maxPrice }],
    queryFn: () =>
      shopApi.products({
        page,
        limit: 12,
        search: search || undefined,
        category: category || undefined,
        sort,
        minPrice,
        maxPrice,
      }),
    staleTime: 30_000,
  });

  const products = data?.data ?? [];
  const pagination = data?.pagination;

  const applySearch = () => {
    setSearch(searchInput);
    setPage(1);
    pushParams({ search: searchInput });
  };

  const applyPriceRange = () => {
    const min = minPriceInput ? Number(minPriceInput) : undefined;
    const max = maxPriceInput ? Number(maxPriceInput) : undefined;
    setMinPrice(min);
    setMaxPrice(max);
    setPage(1);
  };

  const handleCategorySelect = (slug: string) => {
    setCategory(slug);
    setPage(1);
    pushParams({ category: slug });
    setShowMobileFilter(false);
  };

  const handleSortChange = (value: string) => {
    setSort(value);
    setPage(1);
    pushParams({ sort: value });
  };

  const clearFilters = () => {
    setSearch('');
    setSearchInput('');
    setCategory('');
    setSort('newest');
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setMinPriceInput('');
    setMaxPriceInput('');
    setPage(1);
    router.push(pathname, { scroll: false });
  };

  const hasFilters =
    !!search || !!category || sort !== 'newest' || minPrice !== undefined || maxPrice !== undefined;

  const sidebarContent = (
    <div className="space-y-6">
      {/* Category tree */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          বিভাগ
        </p>
        <div className="space-y-0.5">
          <button
            onClick={() => handleCategorySelect('')}
            className={cn(
              'w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors',
              !category
                ? 'bg-primary text-white font-medium'
                : 'hover:bg-muted text-foreground',
            )}
          >
            সব বিভাগ
          </button>
          <CategoryList
            nodes={categoryTree}
            activeSlug={category}
            onSelect={handleCategorySelect}
          />
        </div>
      </div>

      {/* Price range */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          মূল্য পরিসীমা
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="সর্বনিম্ন"
            value={minPriceInput}
            onChange={(e) => setMinPriceInput(e.target.value)}
            className="h-8 text-sm"
          />
          <span className="text-muted-foreground text-xs">–</span>
          <Input
            type="number"
            placeholder="সর্বোচ্চ"
            value={maxPriceInput}
            onChange={(e) => setMaxPriceInput(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <Button
          size="sm"
          className="mt-2 w-full"
          onClick={applyPriceRange}
          variant="outline"
        >
          প্রয়োগ করুন
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile filter slide-over overlay */}
      {showMobileFilter && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowMobileFilter(false)}
          />
          {/* Panel */}
          <div className="absolute bottom-0 left-0 top-0 w-72 overflow-y-auto bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-semibold">ফিল্টার</p>
              <button
                onClick={() => setShowMobileFilter(false)}
                className="rounded-md p-1 hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="border-b border-border bg-white">
        <div className="container-page py-6">
          <h1 className="text-2xl font-bold">সকল বই</h1>
          {pagination && (
            <p className="mt-1 text-sm text-muted-foreground">
              মোট {pagination.total} টি বই পাওয়া গেছে
            </p>
          )}
        </div>
      </div>

      <div className="container-page py-6">
        {/* Top bar: search + mobile filter toggle + sort */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[180px] flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="বই খুঁজুন..."
              className="pl-9"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            />
          </div>
          <Button variant="outline" onClick={applySearch}>
            খুঁজুন
          </Button>

          {/* Mobile-only filter button */}
          <Button
            variant="outline"
            className="gap-2 lg:hidden"
            onClick={() => setShowMobileFilter(true)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            ফিল্টার
          </Button>

          {/* Sort select */}
          <div className="w-44">
            <Select value={sort} onValueChange={handleSortChange}>
              <SelectTrigger>
                <SelectValue placeholder="সাজানো" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="gap-1.5 text-muted-foreground"
            >
              <X className="h-3.5 w-3.5" />
              ক্লিয়ার
            </Button>
          )}
        </div>

        {/* Active filter chips */}
        {hasFilters && (
          <div className="mb-4 flex flex-wrap gap-2">
            {search && (
              <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                খুঁজছেন: {search}
                <button
                  onClick={() => {
                    setSearch('');
                    setSearchInput('');
                    setPage(1);
                    pushParams({ search: '' });
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {category && (
              <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                বিভাগ: {slugNameMap.get(category) ?? category}
                <button
                  onClick={() => {
                    setCategory('');
                    setPage(1);
                    pushParams({ category: '' });
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {(minPrice !== undefined || maxPrice !== undefined) && (
              <span className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                মূল্য: ৳ {minPrice ?? '০'} – {maxPrice ?? '∞'}
                <button
                  onClick={() => {
                    setMinPrice(undefined);
                    setMaxPrice(undefined);
                    setMinPriceInput('');
                    setMaxPriceInput('');
                    setPage(1);
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Desktop layout: sidebar + grid */}
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-xl border border-border bg-white p-4">
              {sidebarContent}
            </div>
          </aside>

          {/* Product grid */}
          <div>
            {isLoading ? (
              <ProductGridSkeleton />
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
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === pagination.totalPages ||
                      Math.abs(p - page) <= 1,
                  )
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
        </div>
      </div>
    </>
  );
}

export default function ShopPage() {
  return (
    <PublicLayout>
      <Suspense
        fallback={
          <div className="container-page py-6">
            <div className="h-8 w-48 animate-pulse rounded bg-muted mb-6" />
            <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
              <div className="hidden lg:block h-96 animate-pulse rounded-xl bg-muted" />
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
            </div>
          </div>
        }
      >
        <ShopContent />
      </Suspense>
    </PublicLayout>
  );
}
