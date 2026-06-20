'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, Settings2, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Can } from '@/components/can';
import { stockApi, type StockMovementFilters } from '@/features/stock/stock.api';
import { AddStockModal } from '@/features/stock/add-stock-modal';
import { AdjustStockModal } from '@/features/stock/adjust-stock-modal';
import { cn } from '@/lib/utils';
import type { StockMovementType } from '@kamiab/types';

const TYPE_LABELS: Record<StockMovementType, string> = {
  purchase: 'Purchase',
  sale: 'Sale',
  return_resalable: 'Return (Good)',
  return_damaged: 'Return (Damaged)',
  adjustment: 'Adjustment',
};

const TYPE_COLORS: Record<StockMovementType, string> = {
  purchase: 'bg-green-100 text-green-800',
  sale: 'bg-blue-100 text-blue-800',
  return_resalable: 'bg-yellow-100 text-yellow-800',
  return_damaged: 'bg-red-100 text-red-800',
  adjustment: 'bg-gray-100 text-gray-800',
};

export default function StockPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [prefillProductId, setPrefillProductId] = useState<string | undefined>();
  const [filters, setFilters] = useState<StockMovementFilters>({ page: 1, limit: 20 });

  const { data: summary } = useQuery({
    queryKey: ['stock-summary'],
    queryFn: () => stockApi.summary(),
    staleTime: 30_000,
  });

  const { data: movementsData, isLoading: movementsLoading } = useQuery({
    queryKey: ['stock-movements', filters],
    queryFn: () => stockApi.movements(filters),
    staleTime: 15_000,
  });

  const movements = movementsData?.data ?? [];
  const pagination = movementsData?.pagination;

  const handleAddFromLowStock = (productId: string) => {
    setPrefillProductId(productId);
    setAddOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Stock Management</h1>
          {summary && (
            <p className="text-sm text-muted-foreground">
              Today&apos;s movements: {summary.todayMovementCount}
              {summary.lowStockProducts.length > 0 && (
                <span className="ml-2 text-orange-600 font-medium">
                  · {summary.lowStockProducts.length} low stock
                </span>
              )}
            </p>
          )}
        </div>
        <Can permission="stock.edit">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setAdjustOpen(true)}>
              <Settings2 className="mr-1.5 h-4 w-4" />
              Adjust Stock
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setPrefillProductId(undefined);
                setAddOpen(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Stock
            </Button>
          </div>
        </Can>
      </div>

      <Tabs defaultValue="low-stock">
        <TabsList>
          <TabsTrigger value="low-stock" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Low Stock
            {(summary?.lowStockProducts.length ?? 0) > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 px-1.5 text-[10px]">
                {summary?.lowStockProducts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="movements">Movement Log</TabsTrigger>
        </TabsList>

        {/* Tab 1: Low Stock */}
        <TabsContent value="low-stock" className="mt-4">
          {!summary?.lowStockProducts.length ? (
            <div className="rounded-xl border border-border bg-white p-12 text-center shadow-sm">
              <p className="text-muted-foreground">All stock levels are healthy ✓</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-white shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Pool Stock</TableHead>
                    <TableHead className="text-right">Reorder Point</TableHead>
                    <Can permission="stock.edit">
                      <TableHead />
                    </Can>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.lowStockProducts.map((p) => (
                    <TableRow key={p.productId}>
                      <TableCell className="font-medium">{p.productName}</TableCell>
                      <TableCell className="text-right">
                        <span className={cn('font-bold', p.poolStock === 0 ? 'text-destructive' : 'text-orange-600')}>
                          {p.poolStock} kg
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">{p.reorderPoint} kg</TableCell>
                      <Can permission="stock.edit">
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleAddFromLowStock(p.productId)}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Add Stock
                          </Button>
                        </TableCell>
                      </Can>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Movement Log */}
        <TabsContent value="movements" className="mt-4 space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Select
              value={filters.type ?? 'all'}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, type: v === 'all' ? undefined : v, page: 1 }))
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="sale">Sale</SelectItem>
                <SelectItem value="return_resalable">Return (Good)</SelectItem>
                <SelectItem value="return_damaged">Return (Damaged)</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              className="w-40"
              value={filters.from ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value || undefined, page: 1 }))}
            />
            <Input
              type="date"
              className="w-40"
              value={filters.to ?? ''}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value || undefined, page: 1 }))}
            />
          </div>

          <div className="rounded-xl border border-border bg-white shadow-sm">
            {movementsLoading ? (
              <div className="py-12 text-center text-muted-foreground text-sm">Loading...</div>
            ) : movements.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">No movements found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product / Variant</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Order #</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((m) => (
                    <TableRow key={m._id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(m.createdAt), 'dd MMM, hh:mm a')}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{m.productName}</p>
                        <p className="text-xs text-muted-foreground">{m.variantLabel}</p>
                      </TableCell>
                      <TableCell>
                        <span className={cn('rounded px-1.5 py-0.5 text-xs font-medium', TYPE_COLORS[m.type])}>
                          {TYPE_LABELS[m.type]}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            'font-bold text-sm flex items-center justify-end gap-0.5',
                            m.qty > 0 ? 'text-green-600' : 'text-red-600',
                          )}
                        >
                          {m.qty > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                          {Math.abs(m.qty)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {m.orderNumber ?? '—'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                        {m.supplier ? `${m.supplier} · ` : ''}{m.note || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Total: {pagination.total}</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={filters.page === 1}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
                >
                  Prev
                </Button>
                <span className="flex items-center px-2">
                  {filters.page} / {pagination.totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={filters.page === pagination.totalPages}
                  onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AddStockModal
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setPrefillProductId(undefined);
        }}
        prefillProductId={prefillProductId}
      />
      <AdjustStockModal open={adjustOpen} onClose={() => setAdjustOpen(false)} />
    </div>
  );
}
