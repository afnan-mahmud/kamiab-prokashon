'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Search, Plus, Trash2, Loader2, ChevronRight, X } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ordersApi } from '@/features/orders/orders.api';
import { shopApi } from '@/features/shop/shop.api';
import { productsApi } from '@/features/products/products.api';
import type { Product } from '@cholonbil/types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CartEntry {
  productId: string;
  productName: string;
  variantId: string;
  variantLabel: string;
  price: number;
  weight: number;
  quantity: number;
}

interface ModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const customerSchema = z.object({
  customerPhone: z.string().min(1, 'Phone required'),
  customerName: z.string().min(1, 'Name required'),
  address: z.string().min(1, 'Address required'),
  city: z.string().min(1, 'City required'),
  area: z.string().min(1, 'Area required'),
});

// ── Step indicators ───────────────────────────────────────────────────────────

const STEPS = ['Customer', 'Products', 'Delivery & Payment', 'Confirm'];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="mb-6 flex items-center gap-1">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-1">
          <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold
            ${i < current ? 'bg-primary text-white' : i === current ? 'bg-primary text-white ring-2 ring-primary/30' : 'bg-muted text-muted-foreground'}`}>
            {i < current ? '✓' : i + 1}
          </div>
          <span className={`hidden text-xs sm:block ${i === current ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
            {label}
          </span>
          {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
        </div>
      ))}
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function ManualOrderModal({ onClose, onSuccess }: ModalProps) {
  const [step, setStep] = useState(0);
  const [customerData, setCustomerData] = useState<z.infer<typeof customerSchema> | null>(null);
  const [cartItems, setCartItems] = useState<CartEntry[]>([]);
  const [deliveryLocation, setDeliveryLocation] = useState<'inside_dhaka' | 'outside_dhaka'>('outside_dhaka');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bkash' | 'card' | 'steadfast'>('cash');
  const [discount, setDiscount] = useState(0);
  const [lookupLoading, setLookupLoading] = useState(false);

  const { data: chargesData } = useQuery({
    queryKey: ['delivery-charges'],
    queryFn: () => shopApi.deliveryCharges(),
    staleTime: 5 * 60_000,
  });

  const createMutation = useMutation({
    mutationFn: ordersApi.create,
    onSuccess: () => {
      toast.success('Order created successfully');
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Delivery charge calculation
  const totalWeight = cartItems.reduce((s, i) => s + i.weight * i.quantity, 0);
  const charges = chargesData;
  const deliveryCharge = charges
    ? Math.max(0, totalWeight - charges.baseWeightKg) * charges.extraPerKg +
      (deliveryLocation === 'inside_dhaka' ? charges.insideDhaka : charges.outsideDhaka)
    : 0;
  const subtotal = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const total = subtotal + deliveryCharge - discount;

  const handleConfirm = () => {
    if (!customerData) return;
    createMutation.mutate({
      ...customerData,
      deliveryLocation,
      paymentMethod,
      discount,
      notes: '',
      items: cartItems.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
      })),
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Manual Order</DialogTitle>
        </DialogHeader>

        <StepIndicator current={step} />

        {step === 0 && (
          <CustomerStep
            initial={customerData}
            lookupLoading={lookupLoading}
            setLookupLoading={setLookupLoading}
            onNext={(data) => { setCustomerData(data); setStep(1); }}
          />
        )}
        {step === 1 && (
          <ProductsStep
            cartItems={cartItems}
            setCartItems={setCartItems}
            onBack={() => setStep(0)}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <DeliveryStep
            deliveryLocation={deliveryLocation}
            setDeliveryLocation={setDeliveryLocation}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            discount={discount}
            setDiscount={setDiscount}
            charges={charges}
            subtotal={subtotal}
            deliveryCharge={deliveryCharge}
            total={total}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <ConfirmStep
            customerData={customerData!}
            cartItems={cartItems}
            deliveryLocation={deliveryLocation}
            paymentMethod={paymentMethod}
            discount={discount}
            deliveryCharge={deliveryCharge}
            total={total}
            isSubmitting={createMutation.isPending}
            onBack={() => setStep(2)}
            onConfirm={handleConfirm}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Step 1: Customer ──────────────────────────────────────────────────────────

function CustomerStep({
  initial, lookupLoading, setLookupLoading, onNext,
}: {
  initial: z.infer<typeof customerSchema> | null;
  lookupLoading: boolean;
  setLookupLoading: (v: boolean) => void;
  onNext: (data: z.infer<typeof customerSchema>) => void;
}) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    defaultValues: initial ?? { customerPhone: '', customerName: '', address: '', city: '', area: '' },
  });

  const handlePhoneBlur = async (phone: string) => {
    if (!phone || phone.length < 11) return;
    setLookupLoading(true);
    try {
      const customer = await shopApi.lookup(phone);
      setValue('customerName', customer.name);
      setValue('address', customer.address);
      setValue('city', customer.city);
      setValue('area', customer.area);
    } catch { /* not found, fill manually */ }
    finally { setLookupLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Phone *</Label>
        <div className="relative">
          <Input {...register('customerPhone')} placeholder="01XXXXXXXXX"
            onBlur={(e) => void handlePhoneBlur(e.target.value)} className="pr-8" />
          {lookupLoading && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        {errors.customerPhone && <p className="text-xs text-destructive">{errors.customerPhone.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Name *</Label>
        <Input {...register('customerName')} placeholder="Customer name" />
        {errors.customerName && <p className="text-xs text-destructive">{errors.customerName.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Address *</Label>
        <Input {...register('address')} placeholder="Street address" />
        {errors.address && <p className="text-xs text-destructive">{errors.address.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>City *</Label>
          <Input {...register('city')} placeholder="Dhaka" />
          {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Area *</Label>
          <Input {...register('area')} placeholder="Mirpur" />
          {errors.area && <p className="text-xs text-destructive">{errors.area.message}</p>}
        </div>
      </div>
      <DialogFooter>
        <Button type="submit">Next: Products</Button>
      </DialogFooter>
    </form>
  );
}

// ── Step 2: Products ──────────────────────────────────────────────────────────

function ProductsStep({
  cartItems, setCartItems, onBack, onNext,
}: {
  cartItems: CartEntry[];
  setCartItems: (items: CartEntry[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [qty, setQty] = useState(1);

  const { data: productsData } = useQuery({
    queryKey: ['products-search', search],
    queryFn: () => productsApi.list({ search: search || undefined, limit: 10 }),
    enabled: true,
    staleTime: 30_000,
  });

  const addToCart = () => {
    if (!selectedProduct) return;
    const variant = selectedProduct.variants.find((v) => v._id === selectedVariantId)
      ?? selectedProduct.variants[0];
    if (!variant) return;

    const existing = cartItems.find(
      (i) => i.productId === selectedProduct._id && i.variantId === variant._id,
    );
    if (existing) {
      setCartItems(cartItems.map((i) =>
        i.productId === selectedProduct._id && i.variantId === variant._id
          ? { ...i, quantity: i.quantity + qty }
          : i,
      ));
    } else {
      setCartItems([...cartItems, {
        productId: selectedProduct._id,
        productName: selectedProduct.name,
        variantId: variant._id,
        variantLabel: variant.label,
        price: variant.price,
        weight: variant.weight,
        quantity: qty,
      }]);
    }
    setSelectedProduct(null);
    setSelectedVariantId('');
    setQty(1);
  };

  const products = productsData?.data ?? [];

  return (
    <div className="space-y-4">
      {/* Product search */}
      <div className="space-y-2">
        <Label>Search & Add Products</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {products.length > 0 && !selectedProduct && (
          <div className="rounded-md border border-border bg-white shadow-md">
            {products.map((p) => (
              <button
                key={p._id}
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                onClick={() => { setSelectedProduct(p); setSearch(''); setSelectedVariantId(p.variants[0]?._id ?? ''); }}
              >
                <span>{p.name}</span>
                <span className="text-xs text-muted-foreground">{p.category}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Variant + qty picker */}
      {selectedProduct && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
          <p className="text-sm font-medium">{selectedProduct.name}</p>
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Variant</Label>
              <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedProduct.variants.map((v) => (
                    <SelectItem key={v._id} value={v._id}>
                      {v.label} — ৳{v.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-20 space-y-1">
              <Label className="text-xs">Qty</Label>
              <Input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                className="h-8"
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="button" size="sm" onClick={addToCart}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setSelectedProduct(null)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Cart summary */}
      {cartItems.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          {cartItems.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-3 py-2 text-sm odd:bg-muted/30">
              <span className="flex-1 truncate">{item.productName} — {item.variantLabel}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">× {item.quantity}</span>
                <span className="font-medium">৳{(item.price * item.quantity).toLocaleString()}</span>
                <button
                  type="button"
                  onClick={() => setCartItems(cartItems.filter((_, j) => j !== i))}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onNext} disabled={cartItems.length === 0}>
          Next: Delivery
        </Button>
      </DialogFooter>
    </div>
  );
}

// ── Step 3: Delivery & Payment ────────────────────────────────────────────────

function DeliveryStep({
  deliveryLocation, setDeliveryLocation, paymentMethod, setPaymentMethod,
  discount, setDiscount, charges, subtotal, deliveryCharge, total, onBack, onNext,
}: {
  deliveryLocation: 'inside_dhaka' | 'outside_dhaka';
  setDeliveryLocation: (v: 'inside_dhaka' | 'outside_dhaka') => void;
  paymentMethod: 'cash' | 'bkash' | 'card' | 'steadfast';
  setPaymentMethod: (v: 'cash' | 'bkash' | 'card' | 'steadfast') => void;
  discount: number;
  setDiscount: (v: number) => void;
  charges: { insideDhaka: number; outsideDhaka: number } | undefined;
  subtotal: number;
  deliveryCharge: number;
  total: number;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>Delivery Location</Label>
        <RadioGroup
          value={deliveryLocation}
          onValueChange={(v) => setDeliveryLocation(v as 'inside_dhaka' | 'outside_dhaka')}
          className="grid grid-cols-2 gap-3"
        >
          {[
            { value: 'inside_dhaka', label: 'Inside Dhaka', charge: charges?.insideDhaka },
            { value: 'outside_dhaka', label: 'Outside Dhaka', charge: charges?.outsideDhaka },
          ].map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:border-primary/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
            >
              <RadioGroupItem value={opt.value} className="mt-0.5" />
              <div>
                <p className="text-sm font-medium">{opt.label}</p>
                {opt.charge !== undefined && (
                  <p className="text-xs text-muted-foreground">from ৳{opt.charge}</p>
                )}
              </div>
            </label>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>Payment Method</Label>
        <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="bkash">bKash</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="steadfast">Steadfast (COD)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Discount (৳)</Label>
        <Input type="number" min={0} value={discount}
          onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))} className="w-32" />
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm space-y-1.5">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span><span>৳{subtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Delivery</span><span>৳{deliveryCharge.toLocaleString()}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span><span>−৳{discount.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-border pt-1.5 font-bold">
          <span>Total</span><span>৳{total.toLocaleString()}</span>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={onNext}>Review Order</Button>
      </DialogFooter>
    </div>
  );
}

// ── Step 4: Confirm ───────────────────────────────────────────────────────────

function ConfirmStep({
  customerData, cartItems, deliveryLocation, paymentMethod,
  discount, deliveryCharge, total, isSubmitting, onBack, onConfirm,
}: {
  customerData: z.infer<typeof customerSchema>;
  cartItems: CartEntry[];
  deliveryLocation: string;
  paymentMethod: string;
  discount: number;
  deliveryCharge: number;
  total: number;
  isSubmitting: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-lg border border-border p-3 space-y-1">
        <p className="font-semibold text-xs text-muted-foreground uppercase mb-2">Customer</p>
        <p>{customerData.customerName} · {customerData.customerPhone}</p>
        <p className="text-muted-foreground">{customerData.address}, {customerData.area}, {customerData.city}</p>
      </div>
      <div className="rounded-lg border border-border p-3 space-y-1.5">
        <p className="font-semibold text-xs text-muted-foreground uppercase mb-2">Items</p>
        {cartItems.map((i, idx) => (
          <div key={idx} className="flex justify-between">
            <span>{i.productName} ({i.variantLabel}) × {i.quantity}</span>
            <span className="font-medium">৳{(i.price * i.quantity).toLocaleString()}</span>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
        <div className="flex justify-between text-muted-foreground">
          <span>Delivery · {deliveryLocation === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka'}</span>
          <span>৳{deliveryCharge.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>Payment: {paymentMethod}</span>
          {discount > 0 && <span className="text-green-600">−৳{discount.toLocaleString()} discount</span>}
        </div>
        <div className="flex justify-between border-t border-border pt-1.5 font-bold text-base">
          <span>Total</span><span className="text-primary">৳{total.toLocaleString()}</span>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>Back</Button>
        <Button onClick={onConfirm} disabled={isSubmitting}>
          {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Confirm Order'}
        </Button>
      </DialogFooter>
    </div>
  );
}

