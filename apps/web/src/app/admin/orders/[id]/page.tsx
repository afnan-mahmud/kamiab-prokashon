'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowLeft, Truck, RefreshCw, Loader2, User, MapPin, Package,
  CreditCard, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Can } from '@/components/can';
import { ordersApi } from '@/features/orders/orders.api';
import { ProcessReturnModal } from '@/features/stock/process-return-modal';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@cholonbil/types';

const ORDER_STATUSES: OrderStatus[] = [
  'Pending', 'Confirmed', 'Cancelled', 'Call not received', 'Fake order', 'Hand over to Courier', 'Returned',
];

const STATUS_COLORS: Record<string, string> = {
  'Pending': 'bg-yellow-100 text-yellow-800',
  'Confirmed': 'bg-blue-100 text-blue-800',
  'Cancelled': 'bg-red-100 text-red-800',
  'Call not received': 'bg-orange-100 text-orange-800',
  'Fake order': 'bg-gray-100 text-gray-800',
  'Hand over to Courier': 'bg-green-100 text-green-800',
  'Returned': 'bg-purple-100 text-purple-800',
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [returnOpen, setReturnOpen] = useState(false);

  const { data: order, isLoading } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => ordersApi.get(id),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (status: string) => ordersApi.update(id, { status }),
    onSuccess: () => {
      toast.success('Status updated');
      void queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      void queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const courierMutation = useMutation({
    mutationFn: () => ordersApi.sendToCourier(id),
    onSuccess: () => {
      toast.success('Sent to Steadfast courier');
      void queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const syncMutation = useMutation({
    mutationFn: () => ordersApi.syncCourier(id),
    onSuccess: (data) => {
      toast.success(`Courier status: ${data.courierStatus}`);
      void queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16">
        <p className="font-medium">Order not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/admin/orders">Back to Orders</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Link href="/admin/orders"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold font-mono">{order.orderNumber}</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(order.createdAt), 'dd MMM yyyy, hh:mm a')}
              {' · '}{order.source}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status selector */}
          <Can permission="orders.edit">
            <Select
              value={order.status}
              onValueChange={(v) => updateMutation.mutate(v)}
              disabled={updateMutation.isPending}
            >
              <SelectTrigger className={cn('h-8 w-48 text-xs font-medium', STATUS_COLORS[order.status])}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Can>

          {/* Send to courier */}
          {order.status === 'Confirmed' && !order.courier?.consignmentId && (
            <Can permission="orders.send_to_courier">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => courierMutation.mutate()}
                disabled={courierMutation.isPending}
              >
                {courierMutation.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Truck className="h-3.5 w-3.5" />}
                Send to Steadfast
              </Button>
            </Can>
          )}

          {/* Sync courier */}
          {order.courier?.consignmentId && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              title="Sync courier status"
            >
              <RefreshCw className={cn('h-4 w-4', syncMutation.isPending && 'animate-spin')} />
            </Button>
          )}

          {/* Process Return */}
          {order.status === 'Hand over to Courier' && (
            <Can permission="orders.edit">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-orange-300 text-orange-700 hover:bg-orange-50"
                onClick={() => setReturnOpen(true)}
              >
                Process Return
              </Button>
            </Can>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-5 lg:col-span-2">
          {/* Items */}
          <div className="rounded-xl border border-border bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Package className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">Order Items</h2>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm font-medium">{item.productName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.variantLabel}</TableCell>
                    <TableCell className="text-right text-sm">৳{item.price.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                    <TableCell className="text-right text-sm font-medium">৳{item.subtotal.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="space-y-1.5 border-t border-border p-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span><span>৳{order.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery ({order.deliveryLocation === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'})</span>
                <span>৳{order.deliveryCharge.toLocaleString()}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span><span>−৳{order.discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 font-bold text-base">
                <span>Total</span><span className="text-primary">৳{order.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Status History */}
          <div className="rounded-xl border border-border bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">Status History</h2>
            </div>
            <div className="p-4">
              {order.statusHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No history yet</p>
              ) : (
                <ol className="relative border-l border-border pl-4 space-y-4">
                  {[...order.statusHistory].reverse().map((entry, i) => (
                    <li key={i} className="relative">
                      <div className="absolute -left-[21px] top-0.5 h-3 w-3 rounded-full border-2 border-primary bg-white" />
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className={cn('rounded px-1.5 py-0.5 text-xs font-medium', STATUS_COLORS[entry.status] ?? 'bg-gray-100')}>
                            {entry.status}
                          </span>
                          {entry.note && (
                            <p className="mt-1 text-xs text-muted-foreground">{entry.note}</p>
                          )}
                        </div>
                        <p className="shrink-0 text-xs text-muted-foreground">
                          {format(new Date(entry.changedAt), 'dd MMM, hh:mm a')}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Customer */}
          <div className="rounded-xl border border-border bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">Customer</h2>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <p className="font-medium">{order.customerSnapshot.name}</p>
              <p className="text-muted-foreground">{order.customerSnapshot.phone}</p>
              {order.notes && (
                <p className="mt-2 rounded-md bg-muted/40 p-2 text-xs italic text-muted-foreground">
                  {order.notes}
                </p>
              )}
            </div>
          </div>

          {/* Delivery address */}
          <div className="rounded-xl border border-border bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">Delivery Address</h2>
            </div>
            <div className="p-4 text-sm space-y-1">
              <p>{order.customerSnapshot.address}</p>
              <p className="text-muted-foreground">
                {order.customerSnapshot.area}, {order.customerSnapshot.city}
              </p>
              <Badge variant="outline" className="mt-2 text-xs">
                {order.deliveryLocation === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'}
              </Badge>
            </div>
          </div>

          {/* Payment */}
          <div className="rounded-xl border border-border bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">Payment</h2>
            </div>
            <div className="p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="font-medium capitalize">{order.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}
                  className="capitalize"
                >
                  {order.paymentStatus}
                </Badge>
              </div>
            </div>
          </div>

          {/* Courier info */}
          {order.courier?.consignmentId && (
            <div className="rounded-xl border border-border bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <Truck className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">Steadfast Courier</h2>
              </div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Consignment ID</span>
                  <span className="font-mono text-xs">{order.courier.consignmentId}</span>
                </div>
                {order.courier.trackingCode && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tracking Code</span>
                    <span className="font-mono text-xs">{order.courier.trackingCode}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery Status</span>
                  <Badge variant="outline" className="capitalize text-xs">
                    {order.courier.status ?? 'pending'}
                  </Badge>
                </div>
                {order.courier.lastSyncedAt && (
                  <p className="text-xs text-muted-foreground">
                    Last synced: {format(new Date(order.courier.lastSyncedAt), 'dd MMM, hh:mm a')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {returnOpen && (
        <ProcessReturnModal
          open={returnOpen}
          onClose={() => setReturnOpen(false)}
          order={order}
        />
      )}
    </div>
  );
}
