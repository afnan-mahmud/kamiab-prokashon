'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Package,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Can } from '@/components/can';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { productsApi } from '@/features/products/products.api';
import type { Product } from '@cholonbil/types';

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products', page, search],
    queryFn: () => productsApi.list({ page, limit: 12, search: search || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => {
      toast.success('Product deleted');
      void queryClient.invalidateQueries({ queryKey: ['products'] });
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const products = data?.data ?? [];
  const pagination = data?.pagination;

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const defaultPrice = (p: Product) => {
    const def = p.variants.find((v) => v.isDefault) ?? p.variants[0];
    return def ? `৳${def.price.toLocaleString()}` : '—';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Products</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {pagination ? `${pagination.total} products total` : ''}
          </p>
        </div>
        <Can permission="products.create">
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus className="mr-1.5 h-4 w-4" />
              Add Product
            </Link>
          </Button>
        </Can>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            className="pl-8"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Button variant="outline" onClick={handleSearch}>
          Search
        </Button>
        {search && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch('');
              setSearchInput('');
              setPage(1);
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-border bg-muted">
              <div className="aspect-square rounded-t-xl bg-muted-foreground/10" />
              <div className="space-y-2 p-3">
                <div className="h-3 w-3/4 rounded bg-muted-foreground/10" />
                <div className="h-3 w-1/2 rounded bg-muted-foreground/10" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Package className="mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-medium">No products found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {search ? 'Try a different search term' : 'Add your first product to get started'}
          </p>
          {!search && (
            <Button asChild className="mt-4">
              <Link href="/admin/products/new">
                <Plus className="mr-1.5 h-4 w-4" />
                Add Product
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
              defaultPrice={defaultPrice(product)}
              onDelete={() => setDeleteTarget(product)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pagination.totalPages}
          </span>
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

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{' '}
            <span className="font-medium text-foreground">{deleteTarget?.name}</span>? This
            action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Product Card ─────────────────────────────────────────────────────────────

interface ProductCardProps {
  product: Product;
  defaultPrice: string;
  onDelete: () => void;
}

function ProductCard({ product, defaultPrice, onDelete }: ProductCardProps) {
  const mainImage = product.images[0];

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      {/* Thumbnail */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {mainImage?.url ? (
          <Image
            src={mainImage.url}
            alt={mainImage.alt || product.name}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
        {/* Status badge */}
        <div className="absolute left-2 top-2">
          <Badge variant={product.isActive ? 'default' : 'secondary'} className="text-[10px]">
            {product.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        {/* Action buttons — appear on hover */}
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Can permission="products.edit">
            <Link
              href={`/admin/products/${product._id}/edit`}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-foreground shadow-sm hover:bg-white"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Link>
          </Can>
          <Can permission="products.delete">
            <button
              type="button"
              onClick={onDelete}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-destructive shadow-sm hover:bg-white"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </Can>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="line-clamp-1 text-sm font-medium">{product.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{product.category}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-primary">{defaultPrice}</span>
          <span className="text-xs text-muted-foreground">
            {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''} · {product.poolStock} kg
          </span>
        </div>
      </div>
    </div>
  );
}
