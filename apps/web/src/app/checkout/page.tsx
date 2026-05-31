'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Loader2, CheckCircle2, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { PublicLayout } from '@/components/layout/public-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useCartStore } from '@/stores/cart.store';
import { shopApi, type DeliveryCharges } from '@/features/shop/shop.api';
import { abandonedOrdersApi } from '@/features/abandoned-orders/abandoned-orders.api';
import { formatPrice } from '@/lib/format';
import { fireEvent } from '@/lib/pixel';
import { gtmBeginCheckout, gtmPurchase } from '@/lib/gtm';

// ── Schema ────────────────────────────────────────────────────────────────────

const checkoutSchema = z.object({
  customerPhone: z
    .string()
    .min(11, 'সঠিক মোবাইল নম্বর দিন')
    .max(14)
    .regex(/^(\+?880|0)1[3-9]\d{8}$/, 'সঠিক বাংলাদেশি নম্বর দিন'),
  customerName: z.string().min(1, 'নাম আবশ্যক'),
  address: z.string().min(5, 'সম্পূর্ণ ঠিকানা দিন'),
  city: z.string().min(1, 'শহর আবশ্যক'),
  area: z.string().min(1, 'এলাকা আবশ্যক'),
  deliveryLocation: z.enum(['inside_dhaka', 'outside_dhaka']),
  notes: z.string().default(''),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcDeliveryCharge(
  charges: DeliveryCharges,
  location: 'inside_dhaka' | 'outside_dhaka',
  totalWeightKg: number,
): number {
  const extra = Math.max(0, totalWeightKg - charges.baseWeightKg);
  return (location === 'inside_dhaka' ? charges.insideDhaka : charges.outsideDhaka) +
    extra * charges.extraPerKg;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const { items, subtotal, clearCart } = useCartStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const capturedPhone = useRef('');

  const { data: charges } = useQuery({
    queryKey: ['delivery-charges'],
    queryFn: () => shopApi.deliveryCharges(),
    staleTime: 5 * 60_000,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerPhone: '',
      customerName: '',
      address: '',
      city: '',
      area: '',
      deliveryLocation: 'outside_dhaka',
      notes: '',
    },
  });

  const deliveryLocation = watch('deliveryLocation');
  const cartSubtotal = subtotal();

  // InitiateCheckout once cart is loaded
  useEffect(() => {
    if (items.length === 0) return;
    fireEvent('InitiateCheckout', {
      value: cartSubtotal,
      currency: 'BDT',
      num_items: items.reduce((s, i) => s + i.quantity, 0),
      content_ids: items.map((i) => i.productId),
    });
    gtmBeginCheckout(
      items.map((i) => ({
        item_id: i.productId,
        item_name: i.productName,
        item_variant: i.variantLabel,
        price: i.price,
        quantity: i.quantity,
      })),
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Calculate total weight from cart
  const totalWeight = items.reduce((s, i) => s + i.weight * i.quantity, 0);
  const deliveryCharge = charges
    ? calcDeliveryCharge(charges, deliveryLocation, totalWeight)
    : null;
  const total = cartSubtotal + (deliveryCharge ?? 0);

  // Phone lookup on blur
  const handlePhoneBlur = async (phone: string) => {
    if (!phone || phone.length < 11) return;
    capturedPhone.current = phone;
    void abandonedOrdersApi.upsert({ phone, source: 'checkout' });
    setLookupLoading(true);
    try {
      const customer = await shopApi.lookup(phone);
      setValue('customerName', customer.name, { shouldValidate: true });
      setValue('address', customer.address, { shouldValidate: true });
      setValue('city', customer.city, { shouldValidate: true });
      setValue('area', customer.area, { shouldValidate: true });
      toast.success('তথ্য স্বয়ংক্রিয়ভাবে পূরণ হয়েছে');
    } catch {
      // Not found — user fills manually, no error needed
    } finally {
      setLookupLoading(false);
    }
  };

  const handleNameBlur = (name: string) => {
    if (!capturedPhone.current || !name.trim()) return;
    void abandonedOrdersApi.upsert({ phone: capturedPhone.current, name: name.trim(), source: 'checkout' });
  };

  const handleAddressBlur = (address: string) => {
    if (!capturedPhone.current || !address.trim()) return;
    void abandonedOrdersApi.upsert({ phone: capturedPhone.current, address: address.trim(), source: 'checkout' });
  };

  const onSubmit = async (values: CheckoutForm) => {
    if (items.length === 0) {
      toast.error('কার্ট খালি');
      return;
    }
    setIsSubmitting(true);
    try {
      const orderTotal = cartSubtotal + (deliveryCharge ?? 0);
      const result = await shopApi.createOrder({
        ...values,
        paymentMethod: 'cash',
        source: 'website',
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
      });
      setOrderNumber(result.orderNumber);
      void abandonedOrdersApi.remove(values.customerPhone);
      fireEvent(
        'Purchase',
        {
          value: orderTotal,
          currency: 'BDT',
          content_ids: items.map((i) => i.productId),
          content_type: 'product',
          order_id: result.orderNumber,
        },
        { phone: values.customerPhone },
      );
      gtmPurchase({
        transactionId: result.orderNumber,
        value: orderTotal,
        shipping: deliveryCharge ?? 0,
        items: items.map((i) => ({
          item_id: i.productId,
          item_name: i.productName,
          item_variant: i.variantLabel,
          price: i.price,
          quantity: i.quantity,
        })),
      });
      clearCart();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'অর্ডার সম্পন্ন হয়নি';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Empty cart redirect
  if (items.length === 0 && !orderNumber) {
    return (
      <PublicLayout>
        <div className="container-page flex flex-col items-center justify-center py-24 text-center">
          <ShoppingBag className="mb-4 h-16 w-16 text-muted-foreground/30" />
          <h1 className="text-xl font-bold">কার্ট খালি</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            প্রথমে পণ্য কার্টে যোগ করুন।
          </p>
          <Button asChild className="mt-6">
            <Link href="/shop">পণ্য দেখুন</Link>
          </Button>
        </div>
      </PublicLayout>
    );
  }

  // Success state
  if (orderNumber) {
    return (
      <PublicLayout>
        <div className="container-page flex flex-col items-center justify-center py-24 text-center">
          <CheckCircle2 className="mb-4 h-16 w-16 text-green-500" />
          <h1 className="text-2xl font-bold">অর্ডার সম্পন্ন হয়েছে!</h1>
          <p className="mt-2 text-muted-foreground">
            আপনার অর্ডার নম্বর:{' '}
            <span className="font-bold text-foreground">{orderNumber}</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            শীঘ্রই আমাদের প্রতিনিধি আপনার সাথে যোগাযোগ করবেন।
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild>
              <Link href="/shop">আরও কেনাকাটা করুন</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">হোমে ফিরুন</Link>
            </Button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container-page py-8">
        <h1 className="mb-6 text-2xl font-bold">চেকআউট</h1>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer info */}
              <div className="rounded-xl border border-border bg-white p-5 shadow-card">
                <h2 className="mb-4 font-bold">ব্যক্তিগত তথ্য</h2>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="customerPhone">মোবাইল নম্বর *</Label>
                    <div className="relative">
                      <Input
                        id="customerPhone"
                        {...register('customerPhone')}
                        placeholder="01XXXXXXXXX"
                        onBlur={(e) => void handlePhoneBlur(e.target.value)}
                        className="pr-8"
                      />
                      {lookupLoading && (
                        <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    {errors.customerPhone && (
                      <p className="text-xs text-destructive">{errors.customerPhone.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      আগে অর্ডার করে থাকলে তথ্য স্বয়ংক্রিয়ভাবে পূরণ হবে
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="customerName">আপনার নাম *</Label>
                    <Input
                      id="customerName"
                      {...register('customerName')}
                      placeholder="পূর্ণ নাম লিখুন"
                      onBlur={(e) => handleNameBlur(e.target.value)}
                    />
                    {errors.customerName && (
                      <p className="text-xs text-destructive">{errors.customerName.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Delivery address */}
              <div className="rounded-xl border border-border bg-white p-5 shadow-card">
                <h2 className="mb-4 font-bold">ডেলিভারি ঠিকানা</h2>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="address">বিস্তারিত ঠিকানা *</Label>
                    <Textarea
                      id="address"
                      {...register('address')}
                      rows={3}
                      placeholder="বাড়ি/ফ্ল্যাট নম্বর, রাস্তা, মহল্লা..."
                      onBlur={(e) => handleAddressBlur(e.target.value)}
                    />
                    {errors.address && (
                      <p className="text-xs text-destructive">{errors.address.message}</p>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="city">শহর / জেলা *</Label>
                      <Input
                        id="city"
                        {...register('city')}
                        placeholder="যেমন: ঢাকা, চট্টগ্রাম..."
                      />
                      {errors.city && (
                        <p className="text-xs text-destructive">{errors.city.message}</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="area">এলাকা / থানা *</Label>
                      <Input
                        id="area"
                        {...register('area')}
                        placeholder="যেমন: মিরপুর, গুলশান..."
                      />
                      {errors.area && (
                        <p className="text-xs text-destructive">{errors.area.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Delivery location */}
                  <div className="space-y-2">
                    <Label>ডেলিভারি লোকেশন *</Label>
                    <RadioGroup
                      defaultValue="outside_dhaka"
                      onValueChange={(v) =>
                        setValue('deliveryLocation', v as 'inside_dhaka' | 'outside_dhaka')
                      }
                      className="grid sm:grid-cols-2 gap-3"
                    >
                      {[
                        {
                          value: 'inside_dhaka',
                          label: 'ঢাকার ভেতরে',
                          charge: charges?.insideDhaka,
                        },
                        {
                          value: 'outside_dhaka',
                          label: 'ঢাকার বাইরে',
                          charge: charges?.outsideDhaka,
                        },
                      ].map((opt) => (
                        <label
                          key={opt.value}
                          className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:border-primary/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                        >
                          <RadioGroupItem value={opt.value} className="mt-0.5" />
                          <div>
                            <p className="font-medium">{opt.label}</p>
                            {opt.charge !== undefined && (
                              <p className="text-xs text-muted-foreground">
                                ডেলিভারি চার্জ: {formatPrice(opt.charge)} থেকে
                              </p>
                            )}
                          </div>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="rounded-xl border border-border bg-white p-5 shadow-card">
                <div className="space-y-1.5">
                  <Label htmlFor="notes">বিশেষ নির্দেশনা (ঐচ্ছিক)</Label>
                  <Textarea
                    id="notes"
                    {...register('notes')}
                    rows={2}
                    placeholder="কোনো বিশেষ নির্দেশনা থাকলে লিখুন..."
                  />
                </div>
              </div>

              {/* Payment */}
              <div className="rounded-xl border border-border bg-white p-5 shadow-card">
                <h2 className="mb-3 font-bold">পেমেন্ট পদ্ধতি</h2>
                <div className="flex items-center gap-3 rounded-lg border border-primary bg-primary/5 p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
                    💵
                  </div>
                  <div>
                    <p className="font-medium">ক্যাশ অন ডেলিভারি</p>
                    <p className="text-xs text-muted-foreground">পণ্য পাওয়ার সময় পরিশোধ করুন</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order summary (sticky) */}
            <div className="lg:col-span-1">
              <div className="sticky top-20 rounded-xl border border-border bg-white p-5 shadow-card">
                <h2 className="mb-4 font-bold">অর্ডার সারসংক্ষেপ</h2>

                <div className="space-y-2 text-sm">
                  {items.map((item) => (
                    <div
                      key={`${item.productId}-${item.variantId}`}
                      className="flex justify-between text-muted-foreground"
                    >
                      <span className="truncate pr-2">
                        {item.productName} ({item.variantLabel}) × {item.quantity}
                      </span>
                      <span className="shrink-0">{formatPrice(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="my-4 border-t border-border" />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>সাবটোটাল</span>
                    <span>{formatPrice(cartSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>ডেলিভারি চার্জ</span>
                    <span>
                      {deliveryCharge !== null ? formatPrice(deliveryCharge) : '—'}
                    </span>
                  </div>
                </div>

                <div className="my-4 border-t border-border" />

                <div className="flex justify-between font-bold">
                  <span>মোট পরিমাণ</span>
                  <span className="text-lg text-primary">{formatPrice(total)}</span>
                </div>

                <Button
                  type="submit"
                  className="mt-4 w-full"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      অর্ডার হচ্ছে...
                    </>
                  ) : (
                    'অর্ডার কনফার্ম করুন'
                  )}
                </Button>

                <p className="mt-3 text-center text-xs text-muted-foreground">
                  ক্যাশ অন ডেলিভারি — পণ্য পাওয়ার পরে পরিশোধ করুন
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </PublicLayout>
  );
}
