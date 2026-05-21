'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowLeft, User, ShoppingBag, Loader2, Pencil, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Can } from '@/components/can';
import { customersApi } from '@/features/customers/customers.api';

const editSchema = z.object({
  name: z.string().min(1).trim(),
  email: z.string().email().or(z.literal('')).optional(),
  notes: z.string().optional(),
});
type EditForm = z.infer<typeof editSchema>;

const STATUS_COLORS: Record<string, string> = {
  'Pending': 'bg-yellow-100 text-yellow-800',
  'Confirmed': 'bg-blue-100 text-blue-800',
  'Cancelled': 'bg-red-100 text-red-800',
  'Call not received': 'bg-orange-100 text-orange-800',
  'Fake order': 'bg-gray-100 text-gray-800',
  'Hand over to Courier': 'bg-green-100 text-green-800',
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);

  const { data: customer, isLoading } = useQuery({
    queryKey: ['admin-customer', id],
    queryFn: () => customersApi.get(id),
    enabled: !!id,
  });

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-customer-orders', id, ordersPage],
    queryFn: () => customersApi.orders(id, ordersPage, 10),
    enabled: !!id,
  });

  const form = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    values: customer
      ? { name: customer.name, email: customer.email ?? '', notes: customer.notes ?? '' }
      : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (data: EditForm) => customersApi.update(id, data),
    onSuccess: () => {
      toast.success('Customer updated');
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ['admin-customer', id] });
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

  if (!customer) {
    return (
      <div className="text-center py-16">
        <p className="font-medium">Customer not found</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/admin/customers">Back to Customers</Link>
        </Button>
      </div>
    );
  }

  const orders = ordersData?.data ?? [];
  const ordersPagination = ordersData?.pagination;
  const avgOrderValue = customer.totalOrders > 0
    ? Math.round(customer.totalSpent / customer.totalOrders)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Link href="/admin/customers"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">{customer.name}</h1>
          <p className="text-sm text-muted-foreground font-mono">{customer.phone}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left — stats + profile */}
        <div className="space-y-5 lg:col-span-1">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Orders', value: customer.totalOrders },
              { label: 'Lifetime', value: `৳${customer.totalSpent.toLocaleString()}` },
              { label: 'Avg. Order', value: `৳${avgOrderValue.toLocaleString()}` },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-white p-3 text-center shadow-sm">
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Profile card */}
          <div className="rounded-xl border border-border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">Profile</h2>
              </div>
              <Can permission="customers.edit">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => setEditing((e) => !e)}
                >
                  <Pencil className="h-3 w-3" />
                  {editing ? 'Cancel' : 'Edit'}
                </Button>
              </Can>
            </div>

            {editing ? (
              <form
                onSubmit={form.handleSubmit((data) => updateMutation.mutate(data))}
                className="p-4 space-y-3"
              >
                <div>
                  <label className="text-xs text-muted-foreground">Name</label>
                  <Input {...form.register('name')} className="mt-1" />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Email (optional)</label>
                  <Input {...form.register('email')} className="mt-1" placeholder="email@example.com" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Admin Notes</label>
                  <Input {...form.register('notes')} className="mt-1" placeholder="Internal notes..." />
                </div>
                <Button type="submit" size="sm" className="w-full" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
                </Button>
              </form>
            ) : (
              <div className="p-4 space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="font-mono font-medium">{customer.phone}</p>
                </div>
                {customer.email && (
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p>{customer.email}</p>
                  </div>
                )}
                {customer.firstOrderAt && (
                  <div>
                    <p className="text-xs text-muted-foreground">First Order</p>
                    <p>{format(new Date(customer.firstOrderAt), 'dd MMM yyyy')}</p>
                  </div>
                )}
                {customer.lastOrderAt && (
                  <div>
                    <p className="text-xs text-muted-foreground">Last Order</p>
                    <p>{format(new Date(customer.lastOrderAt), 'dd MMM yyyy')}</p>
                  </div>
                )}
                {customer.notes && (
                  <div className="rounded-md bg-muted/40 p-2">
                    <p className="text-xs text-muted-foreground">Notes</p>
                    <p className="text-xs italic mt-1">{customer.notes}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Customer since</p>
                  <p>{format(new Date(customer.createdAt), 'dd MMM yyyy')}</p>
                </div>
              </div>
            )}
          </div>

          {/* Addresses */}
          {customer.addresses.length > 0 && (
            <div className="rounded-xl border border-border bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <h2 className="font-semibold text-sm">Saved Addresses</h2>
              </div>
              <div className="p-4 space-y-3">
                {customer.addresses.map((addr, i) => (
                  <div key={i} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{addr.label}</span>
                      {addr.isDefault && <Badge variant="secondary" className="text-xs">Default</Badge>}
                    </div>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {addr.address}, {addr.area}, {addr.city}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — order history */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-border bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">Order History</h2>
              {ordersPagination && (
                <span className="ml-auto text-xs text-muted-foreground">
                  {ordersPagination.total} orders
                </span>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">View</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordersLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-3 w-full animate-pulse rounded bg-muted" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : orders.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                        No orders yet
                      </TableCell>
                    </TableRow>
                  )
                  : orders.map((order) => (
                      <TableRow key={order._id}>
                        <TableCell className="font-mono text-xs font-medium">
                          {order.orderNumber}
                        </TableCell>
                        <TableCell className="text-sm">{order.items.length} items</TableCell>
                        <TableCell className="text-right text-sm font-semibold">
                          ৳{order.total.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[order.status] ?? 'bg-gray-100 text-gray-800'}`}>
                            {order.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(order.createdAt), 'dd MMM yy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                            <Link href={`/admin/orders/${order._id}`}>View</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>

            {ordersPagination && ordersPagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 border-t border-border p-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOrdersPage((p) => p - 1)}
                  disabled={ordersPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  {ordersPage} / {ordersPagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOrdersPage((p) => p + 1)}
                  disabled={ordersPage === ordersPagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
