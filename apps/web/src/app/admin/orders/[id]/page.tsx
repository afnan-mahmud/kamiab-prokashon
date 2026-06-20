'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowLeft, Truck, RefreshCw, Loader2, User, MapPin, Package,
  CreditCard, Clock, Pencil, X, Check, Plus, Trash2, ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Can } from '@/components/can';
import { ordersApi } from '@/features/orders/orders.api';
import { productsApi } from '@/features/products/products.api';
import { ProcessReturnModal } from '@/features/stock/process-return-modal';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@kamiab/types';
import type { UpdateOrderInput } from '@/features/orders/orders.api';

interface ItemDraft {
  productId: string;
  variantId: string;
  productName: string;
  variantLabel: string;
  price: number;
  quantity: number;
}

const ORDER_STATUSES: OrderStatus[] = [
  'Pending', 'Confirmed', 'Cancelled', 'Call not received', 'Fake order', 'Hand over to Courier', 'Returned',
];

const FRAUD_SIGNAL_CONFIG: Record<string, { label: string; badge: string; bar: string; dot: string }> = {
  green: { label: 'Low Risk', badge: 'bg-green-100 text-green-800', bar: 'bg-green-500', dot: 'bg-green-500' },
  yellow: { label: 'Medium Risk', badge: 'bg-yellow-100 text-yellow-800', bar: 'bg-yellow-500', dot: 'bg-yellow-500' },
  red: { label: 'High Risk', badge: 'bg-red-100 text-red-700', bar: 'bg-red-500', dot: 'bg-red-500' },
};

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

  // Customer edit state
  const [editCustomer, setEditCustomer] = useState(false);
  const [customerDraft, setCustomerDraft] = useState({ name: '', phone: '' });

  // Address edit state
  const [editAddress, setEditAddress] = useState(false);
  const [addressDraft, setAddressDraft] = useState({
    address: '', city: '', area: '',
    deliveryLocation: 'inside_dhaka' as 'inside_dhaka' | 'outside_dhaka',
  });

  // Items edit state
  const [editItems, setEditItems] = useState(false);
  const [itemsDraft, setItemsDraft] = useState<ItemDraft[]>([]);
  const [newProductId, setNewProductId] = useState('');
  const [newVariantId, setNewVariantId] = useState('');
  const [newQty, setNewQty] = useState(1);

  const { data: order, isLoading } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => ordersApi.get(id),
    enabled: !!id,
  });

  const { data: productsData } = useQuery({
    queryKey: ['admin-products-order-edit'],
    queryFn: () => productsApi.list({ limit: 200, isActive: true }),
    enabled: editItems,
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

  const editMutation = useMutation({
    mutationFn: (data: UpdateOrderInput) => ordersApi.update(id, data),
    onSuccess: () => {
      toast.success('Order updated');
      void queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      void queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      setEditCustomer(false);
      setEditAddress(false);
      setEditItems(false);
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

  const fraudMutation = useMutation({
    mutationFn: () => ordersApi.fraudCheck(id),
    onSuccess: () => {
      toast.success('Fraud check complete');
      void queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function startEditCustomer() {
    if (!order) return;
    setCustomerDraft({ name: order.customerSnapshot.name, phone: order.customerSnapshot.phone });
    setEditCustomer(true);
  }

  function startEditAddress() {
    if (!order) return;
    setAddressDraft({
      address: order.customerSnapshot.address,
      city: order.customerSnapshot.city,
      area: order.customerSnapshot.area ?? '',
      deliveryLocation: order.deliveryLocation,
    });
    setEditAddress(true);
  }

  function startEditItems() {
    if (!order) return;
    setItemsDraft(order.items.map(item => ({
      productId: item.product,
      variantId: item.variantId,
      productName: item.productName,
      variantLabel: item.variantLabel,
      price: item.price,
      quantity: item.quantity,
    })));
    setNewProductId('');
    setNewVariantId('');
    setNewQty(1);
    setEditItems(true);
  }

  function addNewItem() {
    if (!newProductId || !newVariantId || newQty < 1 || !productsData) return;
    const product = productsData.data.find(p => p._id === newProductId);
    if (!product) return;
    const variant = product.variants.find(v => v._id === newVariantId);
    if (!variant) return;

    const existingIdx = itemsDraft.findIndex(
      i => i.productId === newProductId && i.variantId === newVariantId,
    );
    if (existingIdx >= 0) {
      setItemsDraft(prev => prev.map((item, idx) =>
        idx === existingIdx ? { ...item, quantity: item.quantity + newQty } : item,
      ));
    } else {
      setItemsDraft(prev => [...prev, {
        productId: newProductId,
        variantId: newVariantId,
        productName: product.name,
        variantLabel: variant.label,
        price: variant.price,
        quantity: newQty,
      }]);
    }
    setNewProductId('');
    setNewVariantId('');
    setNewQty(1);
  }

  const selectedProduct = productsData?.data.find(p => p._id === newProductId);
  const draftSubtotal = itemsDraft.reduce((s, i) => s + i.price * i.quantity, 0);

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
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">Order Items</h2>
              </div>
              {!editItems && (
                <Can permission="orders.edit">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={startEditItems}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </Can>
              )}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  {editItems && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {editItems ? (
                  itemsDraft.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm font-medium">{item.productName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.variantLabel}</TableCell>
                      <TableCell className="text-right text-sm">৳{item.price.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm">
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={e => setItemsDraft(prev => prev.map((d, idx) =>
                            idx === i ? { ...d, quantity: Math.max(1, Number(e.target.value)) } : d,
                          ))}
                          className="h-7 w-16 text-right text-xs ml-auto"
                        />
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        ৳{(item.price * item.quantity).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setItemsDraft(prev => prev.filter((_, idx) => idx !== i))}
                          disabled={itemsDraft.length === 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  order.items.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm font-medium">{item.productName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.variantLabel}</TableCell>
                      <TableCell className="text-right text-sm">৳{item.price.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                      <TableCell className="text-right text-sm font-medium">৳{item.subtotal.toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Add product row (edit mode only) */}
            {editItems && (
              <div className="border-t border-border p-4">
                <p className="mb-3 text-xs font-medium text-muted-foreground">Add Product</p>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-[160px]">
                    <Select
                      value={newProductId}
                      onValueChange={v => { setNewProductId(v); setNewVariantId(''); }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {productsData?.data.map(p => (
                          <SelectItem key={p._id} value={p._id} className="text-xs">{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1 min-w-[130px]">
                    <Select
                      value={newVariantId}
                      onValueChange={setNewVariantId}
                      disabled={!selectedProduct}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Variant" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedProduct?.variants.map(v => (
                          <SelectItem key={v._id} value={v._id} className="text-xs">
                            {v.label} — ৳{v.price.toLocaleString()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    type="number"
                    min={1}
                    value={newQty}
                    onChange={e => setNewQty(Math.max(1, Number(e.target.value)))}
                    className="h-8 w-20 text-sm"
                    placeholder="Qty"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5 text-xs"
                    onClick={addNewItem}
                    disabled={!newProductId || !newVariantId}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="space-y-1.5 border-t border-border p-4 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>৳{(editItems ? draftSubtotal : order.subtotal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Delivery ({order.deliveryLocation === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'})</span>
                {editItems ? (
                  <span className="text-xs italic">recalculated on save</span>
                ) : (
                  <span>৳{order.deliveryCharge.toLocaleString()}</span>
                )}
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span><span>−৳{order.discount.toLocaleString()}</span>
                </div>
              )}
              {!editItems && (
                <div className="flex justify-between border-t border-border pt-2 font-bold text-base">
                  <span>Total</span><span className="text-primary">৳{order.total.toLocaleString()}</span>
                </div>
              )}
            </div>

            {/* Items edit actions */}
            {editItems && (
              <div className="flex gap-2 border-t border-border px-4 py-3">
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={() => editMutation.mutate({
                    items: itemsDraft.map(i => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
                  })}
                  disabled={editMutation.isPending || itemsDraft.length === 0}
                >
                  {editMutation.isPending
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Check className="h-3 w-3" />}
                  Save Items
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1"
                  onClick={() => setEditItems(false)}
                  disabled={editMutation.isPending}
                >
                  <X className="h-3 w-3" /> Cancel
                </Button>
              </div>
            )}
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
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">Customer</h2>
              </div>
              {!editCustomer && (
                <Can permission="orders.edit">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={startEditCustomer}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </Can>
              )}
            </div>
            {editCustomer ? (
              <div className="p-4 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={customerDraft.name}
                    onChange={e => setCustomerDraft(d => ({ ...d, name: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Phone</Label>
                  <Input
                    value={customerDraft.phone}
                    onChange={e => setCustomerDraft(d => ({ ...d, phone: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => editMutation.mutate({ customerSnapshot: customerDraft })}
                    disabled={editMutation.isPending || !customerDraft.name || !customerDraft.phone}
                  >
                    {editMutation.isPending
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Check className="h-3 w-3" />}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1"
                    onClick={() => setEditCustomer(false)}
                    disabled={editMutation.isPending}
                  >
                    <X className="h-3 w-3" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-2 text-sm">
                <p className="font-medium">{order.customerSnapshot.name}</p>
                <p className="text-muted-foreground">{order.customerSnapshot.phone}</p>
                {order.notes && (
                  <p className="mt-2 rounded-md bg-muted/40 p-2 text-xs italic text-muted-foreground">
                    {order.notes}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Fraud Check */}
          <Can permission="orders.fraud_check">
            <div className="rounded-xl border border-border bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold">Fraud Check</h2>
                </div>
                {order.fraud && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    onClick={() => fraudMutation.mutate()}
                    disabled={fraudMutation.isPending}
                  >
                    <RefreshCw className={cn('h-3.5 w-3.5', fraudMutation.isPending && 'animate-spin')} />
                    Re-check
                  </Button>
                )}
              </div>

              {!order.fraud ? (
                <div className="p-4">
                  <p className="mb-3 text-xs text-muted-foreground">
                    Check this customer&apos;s courier delivery history across Steadfast, Pathao &amp; RedX.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5"
                    onClick={() => fraudMutation.mutate()}
                    disabled={fraudMutation.isPending}
                  >
                    {fraudMutation.isPending
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <ShieldCheck className="h-3.5 w-3.5" />}
                    Run Fraud Check
                  </Button>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {/* Signal + ratio */}
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                        FRAUD_SIGNAL_CONFIG[order.fraud.signal]?.badge,
                      )}
                    >
                      <span className={cn('h-2 w-2 rounded-full', FRAUD_SIGNAL_CONFIG[order.fraud.signal]?.dot)} />
                      {FRAUD_SIGNAL_CONFIG[order.fraud.signal]?.label ?? order.fraud.signal}
                    </span>
                    <span className="text-2xl font-bold tabular-nums">{order.fraud.successRatio}%</span>
                  </div>

                  {order.fraud.isNewCustomer ? (
                    <p className="rounded-md bg-muted/40 p-2 text-xs italic text-muted-foreground">
                      No courier history found — likely a new customer.
                    </p>
                  ) : (
                    <>
                      {/* Success bar */}
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn('h-full rounded-full', FRAUD_SIGNAL_CONFIG[order.fraud.signal]?.bar)}
                          style={{ width: `${order.fraud.successRatio}%` }}
                        />
                      </div>

                      {/* Totals */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="rounded-md bg-muted/40 py-1.5">
                          <p className="font-semibold tabular-nums">{order.fraud.totalOrders}</p>
                          <p className="text-muted-foreground">Total</p>
                        </div>
                        <div className="rounded-md bg-green-50 py-1.5">
                          <p className="font-semibold tabular-nums text-green-700">{order.fraud.delivered}</p>
                          <p className="text-muted-foreground">Delivered</p>
                        </div>
                        <div className="rounded-md bg-red-50 py-1.5">
                          <p className="font-semibold tabular-nums text-red-700">{order.fraud.cancelled}</p>
                          <p className="text-muted-foreground">Cancelled</p>
                        </div>
                      </div>

                      {/* Per-courier breakdown */}
                      {order.fraud.couriers.length > 0 && (
                        <div className="space-y-1.5 border-t border-border pt-2">
                          {order.fraud.couriers.map((c) => (
                            <div key={c.name} className="flex items-center justify-between text-xs">
                              <span className="capitalize text-muted-foreground">{c.name}</span>
                              <span className="tabular-nums">
                                <span className="font-medium">{c.ratio}%</span>
                                <span className="text-muted-foreground"> · {c.delivered}/{c.total}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Checked {format(new Date(order.fraud.checkedAt), 'dd MMM, hh:mm a')}
                  </p>
                </div>
              )}
            </div>
          </Can>

          {/* Delivery Address */}
          <div className="rounded-xl border border-border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">Delivery Address</h2>
              </div>
              {!editAddress && (
                <Can permission="orders.edit">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={startEditAddress}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </Can>
              )}
            </div>
            {editAddress ? (
              <div className="p-4 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Address</Label>
                  <Input
                    value={addressDraft.address}
                    onChange={e => setAddressDraft(d => ({ ...d, address: e.target.value }))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Area</Label>
                    <Input
                      value={addressDraft.area}
                      onChange={e => setAddressDraft(d => ({ ...d, area: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">City</Label>
                    <Input
                      value={addressDraft.city}
                      onChange={e => setAddressDraft(d => ({ ...d, city: e.target.value }))}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Delivery Location</Label>
                  <RadioGroup
                    value={addressDraft.deliveryLocation}
                    onValueChange={v => setAddressDraft(d => ({
                      ...d, deliveryLocation: v as 'inside_dhaka' | 'outside_dhaka',
                    }))}
                    className="flex gap-4"
                  >
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="inside_dhaka" id="inside" className="h-3.5 w-3.5" />
                      <Label htmlFor="inside" className="text-xs cursor-pointer">Inside Dhaka</Label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="outside_dhaka" id="outside" className="h-3.5 w-3.5" />
                      <Label htmlFor="outside" className="text-xs cursor-pointer">Outside Dhaka</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => editMutation.mutate({
                      customerSnapshot: {
                        address: addressDraft.address,
                        city: addressDraft.city,
                        area: addressDraft.area,
                      },
                      deliveryLocation: addressDraft.deliveryLocation,
                    })}
                    disabled={editMutation.isPending || !addressDraft.address || !addressDraft.city}
                  >
                    {editMutation.isPending
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Check className="h-3 w-3" />}
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1"
                    onClick={() => setEditAddress(false)}
                    disabled={editMutation.isPending}
                  >
                    <X className="h-3 w-3" /> Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 text-sm space-y-1">
                <p>{order.customerSnapshot.address}</p>
                <p className="text-muted-foreground">
                  {order.customerSnapshot.area}, {order.customerSnapshot.city}
                </p>
                <Badge variant="outline" className="mt-2 text-xs">
                  {order.deliveryLocation === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'}
                </Badge>
              </div>
            )}
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
