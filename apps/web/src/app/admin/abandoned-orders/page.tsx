'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Trash2, AlertTriangle, ArrowRightLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { abandonedOrdersApi, type AbandonedOrder } from '@/features/abandoned-orders/abandoned-orders.api';

const SOURCE_LABELS: Record<string, string> = {
  landing_page: 'Landing Page',
  checkout: 'Checkout',
};

export default function AbandonedOrdersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-abandoned-orders', { page, statusFilter }],
    queryFn: () => abandonedOrdersApi.list(page, statusFilter || undefined),
  });

  const markFakeMutation = useMutation({
    mutationFn: (id: string) => abandonedOrdersApi.markFake(id),
    onSuccess: () => {
      toast.success('Status updated');
      void queryClient.invalidateQueries({ queryKey: ['admin-abandoned-orders'] });
    },
    onError: () => toast.error('Failed to update status'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => abandonedOrdersApi.delete(id),
    onSuccess: () => {
      toast.success('Deleted');
      void queryClient.invalidateQueries({ queryKey: ['admin-abandoned-orders'] });
    },
    onError: () => toast.error('Failed to delete'),
  });

  const handleConvert = (record: AbandonedOrder) => {
    router.push(`/admin/orders?phone=${encodeURIComponent(record.phone)}`);
  };

  const items = data?.items ?? [];
  const totalPages = data?.pages ?? 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Abandoned Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Customers who started filling forms but didn&apos;t complete their order
          </p>
        </div>
        <Badge variant="secondary">{data?.total ?? 0} total</Badge>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={statusFilter || 'all'} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="fake">Fake</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phone</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No abandoned orders found
                </TableCell>
              </TableRow>
            ) : (
              items.map((record) => (
                <TableRow key={record._id} className={record.status === 'fake' ? 'opacity-60' : ''}>
                  <TableCell className="font-mono font-medium">{record.phone}</TableCell>
                  <TableCell>{record.name ?? <span className="text-muted-foreground text-xs">—</span>}</TableCell>
                  <TableCell className="max-w-[180px] truncate">
                    {record.address ?? <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {SOURCE_LABELS[record.source] ?? record.source}
                      {record.landingPageSlug && (
                        <span className="ml-1 text-muted-foreground">/{record.landingPageSlug}</span>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={record.status === 'fake' ? 'destructive' : 'secondary'}
                      className="text-xs"
                    >
                      {record.status === 'fake' ? 'Fake' : 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(record.createdAt), 'dd MMM, HH:mm')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs gap-1"
                        onClick={() => handleConvert(record)}
                        title="Convert to order"
                      >
                        <ArrowRightLeft className="h-3 w-3" />
                        Convert
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={`h-7 px-2 text-xs gap-1 ${record.status === 'fake' ? 'text-muted-foreground' : 'text-orange-600 hover:text-orange-700'}`}
                        onClick={() => markFakeMutation.mutate(record._id)}
                        disabled={markFakeMutation.isPending}
                        title={record.status === 'fake' ? 'Mark as active' : 'Mark as fake'}
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {record.status === 'fake' ? 'Unfake' : 'Fake'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm('Delete this record?')) deleteMutation.mutate(record._id);
                        }}
                        disabled={deleteMutation.isPending}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{data?.total ?? 0} records</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
