'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Plus, Search, RefreshCw, Truck, Eye, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Can } from '@/components/can';
import { ordersApi } from '@/features/orders/orders.api';
import { cn } from '@/lib/utils';
import type { Order } from '@cholonbil/types';
import { ManualOrderModal } from './manual-order-modal';

const ORDER_STATUSES = [
  'Pending', 'Confirmed', 'Cancelled', 'Call not received', 'Fake order', 'Hand over to Courier',
] as const;

const STATUS_COLORS: Record<string, string> = {
  'Pending': 'bg-yellow-100 text-yellow-800',
  'Confirmed': 'bg-blue-100 text-blue-800',
  'Cancelled': 'bg-red-100 text-red-800',
  'Call not received': 'bg-orange-100 text-orange-800',
  'Fake order': 'bg-gray-100 text-gray-800',
  'Hand over to Courier': 'bg-green-100 text-green-800',
};

const PAYMENT_METHODS = ['cash', 'bkash', 'card', 'steadfast'];

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', { page, search, statusFilter, paymentFilter }],
    queryFn: () =>
      ordersApi.list({
        page,
        limit: 20,
        search: search || undefined,
        status: statusFilter || undefined,
        paymentMethod: paymentFilter || undefined,
      }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ordersApi.update(id, { status }),
    onSuccess: () => {
      toast.success('Status updated');
      void queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sendCourierMutation = useMutation({
    mutationFn: (id: string) => ordersApi.sendToCourier(id),
    onSuccess: () => {
      toast.success('Order sent to Steadfast');
      void queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => ordersApi.syncCourier(id),
    onSuccess: (data) => {
      toast.success(`Courier status: ${data.courierStatus}`);
      void queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const orders = data?.data ?? [];
  const pagination = data?.pagination;

  const applySearch = () => { setSearch(searchInput); setPage(1); };
  const clearFilters = () => {
    setSearch(''); setSearchInput(''); setStatusFilter('');
    setPaymentFilter(''); setPage(1);
  };
  const hasFilters = search || statusFilter || paymentFilter;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          {pagination && (
            <p className="mt-0.5 text-sm text-muted-foreground">{pagination.total} total orders</p>
          )}
        </div>
        <Can permission="orders.create">
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Order
          </Button>
        </Can>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order#, phone, name..."
            className="pl-8"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
          />
        </div>
        <Button variant="outline" onClick={applySearch}>Search</Button>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Payments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters} className="gap-1.5 text-muted-foreground">
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Courier</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-3 w-full animate-pulse rounded bg-muted" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : orders.length === 0
              ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              )
              : orders.map((order) => (
                  <OrderRow
                    key={order._id}
                    order={order}
                    onStatusChange={(status) =>
                      updateStatusMutation.mutate({ id: order._id, status })
                    }
                    onSendCourier={() => sendCourierMutation.mutate(order._id)}
                    onSyncCourier={() => syncMutation.mutate(order._id)}
                    isUpdating={updateStatusMutation.isPending}
                    isSending={sendCourierMutation.isPending}
                    isSyncing={syncMutation.isPending}
                  />
                ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pagination.totalPages}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page === pagination.totalPages}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Manual create modal */}
      {showCreateModal && (
        <ManualOrderModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            void queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
          }}
        />
      )}
    </div>
  );
}

// ── Order Row ─────────────────────────────────────────────────────────────────

interface OrderRowProps {
  order: Order;
  onStatusChange: (status: string) => void;
  onSendCourier: () => void;
  onSyncCourier: () => void;
  isUpdating: boolean;
  isSending: boolean;
  isSyncing: boolean;
}

function OrderRow({
  order, onStatusChange, onSendCourier, onSyncCourier,
  isUpdating, isSending, isSyncing,
}: OrderRowProps) {
  return (
    <TableRow>
      <TableCell className="font-mono text-xs font-medium">{order.orderNumber}</TableCell>
      <TableCell>
        <div>
          <p className="text-sm font-medium">{order.customerSnapshot.name}</p>
          <p className="text-xs text-muted-foreground">{order.customerSnapshot.phone}</p>
        </div>
      </TableCell>
      <TableCell className="text-sm">{order.items.length} items</TableCell>
      <TableCell className="text-sm font-semibold">৳{order.total.toLocaleString()}</TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs capitalize">{order.paymentMethod}</Badge>
      </TableCell>
      <TableCell>
        <Can permission="orders.edit" fallback={
          <span className={cn('rounded px-2 py-0.5 text-xs font-medium', STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-800')}>
            {order.status}
          </span>
        }>
          <Select
            value={order.status}
            onValueChange={onStatusChange}
            disabled={isUpdating}
          >
            <SelectTrigger className={cn('h-7 w-44 border-0 px-2 text-xs font-medium', STATUS_COLORS[order.status] ?? 'bg-gray-100')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Can>
      </TableCell>
      <TableCell>
        {order.courier?.consignmentId ? (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">{order.courier.status ?? '—'}</span>
            <button
              onClick={onSyncCourier}
              disabled={isSyncing}
              className="rounded p-0.5 hover:bg-muted"
              title="Sync courier status"
            >
              <RefreshCw className={cn('h-3 w-3 text-muted-foreground', isSyncing && 'animate-spin')} />
            </button>
          </div>
        ) : order.status === 'Confirmed' ? (
          <Can permission="orders.send_to_courier">
            <Button
              size="sm"
              variant="outline"
              className="h-6 gap-1 px-2 text-xs"
              onClick={onSendCourier}
              disabled={isSending}
            >
              <Truck className="h-3 w-3" />
              Send
            </Button>
          </Can>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {format(new Date(order.createdAt), 'dd MMM yy')}
      </TableCell>
      <TableCell className="text-right">
        <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0">
          <Link href={`/admin/orders/${order._id}`}>
            <Eye className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}
