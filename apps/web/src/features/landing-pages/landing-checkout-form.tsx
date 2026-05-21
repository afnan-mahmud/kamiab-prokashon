'use client';

import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, CheckCircle } from 'lucide-react';
import { landingPagesApi } from './landing-pages.api';
import { shopApi } from '@/features/shop/shop.api';
import type { Product } from '@cholonbil/types';
import { fireEvent } from '@/lib/pixel';

const checkoutSchema = z.object({
  variantId: z.string().min(1, 'Please select a variant'),
  quantity: z.coerce.number().int().min(1).max(100),
  phone: z.string().regex(/^01[3-9]\d{8}$/, 'Valid Bangladeshi phone required'),
  name: z.string().min(1, 'Name is required').trim(),
  address: z.string().min(5, 'Full address required').trim(),
  city: z.string().min(1, 'City is required').trim(),
  area: z.string().min(1, 'Area is required').trim(),
  deliveryLocation: z.enum(['inside_dhaka', 'outside_dhaka']),
  paymentMethod: z.enum(['cash', 'bkash', 'card']),
});
type CheckoutForm = z.infer<typeof checkoutSchema>;

interface Props {
  slug: string;
  product: Product;
  selectedVariantIds: string[];
  ctaText?: string;
  primaryColor?: string;
  accentColor?: string;
}

export function LandingCheckoutForm({ slug, product, selectedVariantIds, ctaText = 'অর্ডার করুন', primaryColor = '#4a7c2e', accentColor = '#d97706' }: Props) {
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const hasFiredCheckout = useRef(false);

  const { data: charges } = useQuery({
    queryKey: ['delivery-charges'],
    queryFn: () => shopApi.deliveryCharges(),
    staleTime: 5 * 60_000,
  });

  const variants = product.variants.filter((v) => {
    const id = String((v as { _id: string })._id ?? '');
    return selectedVariantIds.length === 0 || selectedVariantIds.includes(id);
  });

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      variantId: variants[0] ? String((variants[0] as { _id: string })._id ?? '') : '',
      quantity: 1,
      deliveryLocation: 'outside_dhaka',
      paymentMethod: 'cash',
    },
  });

  const selectedVariantId = form.watch('variantId');
  const deliveryLocation = form.watch('deliveryLocation');
  const quantity = form.watch('quantity') || 1;

  const selectedVariant = variants.find((v) => String((v as { _id: string })._id ?? '') === selectedVariantId);
  const subtotal = (selectedVariant?.price ?? 0) * quantity;

  function calcDeliveryCharge(location: 'inside_dhaka' | 'outside_dhaka', weightKg: number): number {
    if (!charges) return location === 'inside_dhaka' ? 60 : 120;
    const extra = Math.max(0, weightKg - charges.baseWeightKg);
    return (location === 'inside_dhaka' ? charges.insideDhaka : charges.outsideDhaka) + extra * charges.extraPerKg;
  }

  const totalWeightKg = (selectedVariant?.weight ?? 0) * quantity;
  const deliveryCharge = calcDeliveryCharge(deliveryLocation, totalWeightKg);
  const total = subtotal + deliveryCharge;

  const handleFormFocus = () => {
    if (hasFiredCheckout.current) return;
    hasFiredCheckout.current = true;
    fireEvent('InitiateCheckout', {
      value: selectedVariant?.price ?? variants[0]?.price ?? 0,
      currency: 'BDT',
      content_ids: [String((product as { _id: string })._id ?? '')],
      content_name: product.name,
      content_type: 'product',
    });
  };

  const mutation = useMutation({
    mutationFn: (data: CheckoutForm) =>
      landingPagesApi.createOrder(slug, {
        ...data,
        variantId: data.variantId,
        quantity: Number(data.quantity),
      }),
    onSuccess: (res, data) => {
      const variant = variants.find(
        (v) => String((v as { _id: string })._id ?? '') === data.variantId,
      );
      const orderTotal = (variant?.price ?? 0) * Number(data.quantity) + calcDeliveryCharge(data.deliveryLocation, (variant?.weight ?? 0) * Number(data.quantity));
      fireEvent(
        'Purchase',
        {
          value: orderTotal,
          currency: 'BDT',
          content_ids: [String((product as { _id: string })._id ?? '')],
          content_name: product.name,
          content_type: 'product',
          order_id: res.orderNumber,
        },
        { phone: data.phone },
      );
      setOrderNumber(res.orderNumber);
    },
  });

  if (orderNumber) {
    return (
      <div className="text-center py-8 space-y-3">
        <CheckCircle className="mx-auto h-14 w-14" style={{ color: primaryColor }} />
        <h3 className="text-xl font-bold">অর্ডার কনফার্ম হয়েছে!</h3>
        <p className="text-muted-foreground text-sm">আপনার অর্ডার নম্বর:</p>
        <p className="font-mono text-lg font-bold">{orderNumber}</p>
        <p className="text-sm text-muted-foreground">শীঘ্রই আমরা আপনার সাথে যোগাযোগ করব।</p>
      </div>
    );
  }

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-opacity-50';
  const errorCls = 'text-xs text-red-500 mt-1';

  return (
    <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} onFocus={handleFormFocus} className="space-y-4">
      {/* Variant selector */}
      {variants.length > 1 && (
        <div>
          <label className="block text-sm font-medium mb-1.5">পণ্যের পরিমাণ বেছে নিন</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {variants.map((v) => {
              const vid = String((v as { _id: string })._id ?? '');
              return (
                <button
                  key={vid}
                  type="button"
                  onClick={() => form.setValue('variantId', vid)}
                  className={`rounded-lg border-2 p-2.5 text-sm text-center transition-all ${selectedVariantId === vid ? 'border-current font-semibold' : 'border-gray-200 hover:border-gray-400'}`}
                  style={selectedVariantId === vid ? { borderColor: primaryColor, color: primaryColor, backgroundColor: primaryColor + '10' } : {}}
                >
                  <div className="font-medium">{v.label}</div>
                  <div className="text-xs mt-0.5">৳{v.price.toLocaleString()}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quantity */}
      <div>
        <label className="block text-sm font-medium mb-1.5">পরিমাণ (Quantity)</label>
        <input type="number" min={1} max={50} {...form.register('quantity')} className={inputCls} style={{ focusRingColor: primaryColor } as React.CSSProperties} />
      </div>

      {/* Phone */}
      <div>
        <label className="block text-sm font-medium mb-1.5">মোবাইল নম্বর *</label>
        <input type="tel" placeholder="01XXXXXXXXX" {...form.register('phone')} className={inputCls} />
        {form.formState.errors.phone && <p className={errorCls}>{form.formState.errors.phone.message}</p>}
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium mb-1.5">নাম *</label>
        <input type="text" placeholder="আপনার নাম" {...form.register('name')} className={inputCls} />
        {form.formState.errors.name && <p className={errorCls}>{form.formState.errors.name.message}</p>}
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium mb-1.5">ঠিকানা *</label>
        <input type="text" placeholder="বাড়ি/রাস্তা/গ্রাম" {...form.register('address')} className={inputCls} />
        {form.formState.errors.address && <p className={errorCls}>{form.formState.errors.address.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">জেলা *</label>
          <input type="text" placeholder="ঢাকা" {...form.register('city')} className={inputCls} />
          {form.formState.errors.city && <p className={errorCls}>{form.formState.errors.city.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">থানা/উপজেলা *</label>
          <input type="text" placeholder="মিরপুর" {...form.register('area')} className={inputCls} />
          {form.formState.errors.area && <p className={errorCls}>{form.formState.errors.area.message}</p>}
        </div>
      </div>

      {/* Delivery location */}
      <div>
        <label className="block text-sm font-medium mb-1.5">ডেলিভারি এলাকা</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { val: 'inside_dhaka', label: 'ঢাকার ভেতরে', charge: charges?.insideDhaka ?? 60 },
            { val: 'outside_dhaka', label: 'ঢাকার বাইরে', charge: charges?.outsideDhaka ?? 120 },
          ].map((o) => (
            <button
              key={o.val}
              type="button"
              onClick={() => form.setValue('deliveryLocation', o.val as 'inside_dhaka' | 'outside_dhaka')}
              className={`rounded-lg border-2 p-2.5 text-sm text-center transition-all ${deliveryLocation === o.val ? 'border-current font-semibold' : 'border-gray-200'}`}
              style={deliveryLocation === o.val ? { borderColor: primaryColor, backgroundColor: primaryColor + '10' } : {}}
            >
              <div>{o.label}</div>
              <div className="text-xs mt-0.5 text-muted-foreground">ডেলিভারি ৳{o.charge}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Payment */}
      <div>
        <label className="block text-sm font-medium mb-1.5">পেমেন্ট পদ্ধতি</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { val: 'cash', label: 'ক্যাশ (COD)' },
            { val: 'bkash', label: 'বিকাশ' },
            { val: 'card', label: 'কার্ড' },
          ].map((m) => (
            <button
              key={m.val}
              type="button"
              onClick={() => form.setValue('paymentMethod', m.val as 'cash' | 'bkash' | 'card')}
              className={`rounded-lg border-2 p-2 text-xs text-center transition-all ${form.watch('paymentMethod') === m.val ? 'border-current font-semibold' : 'border-gray-200'}`}
              style={form.watch('paymentMethod') === m.val ? { borderColor: primaryColor, backgroundColor: primaryColor + '10' } : {}}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Order summary */}
      {selectedVariant && (
        <div className="rounded-lg p-3 text-sm space-y-1.5" style={{ backgroundColor: primaryColor + '10' }}>
          <div className="flex justify-between">
            <span>পণ্যের মূল্য ({quantity}×৳{selectedVariant.price.toLocaleString()})</span>
            <span className="font-medium">৳{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>ডেলিভারি চার্জ</span>
            <span>৳{deliveryCharge}</span>
          </div>
          <div className="flex justify-between font-bold border-t pt-1.5">
            <span>মোট</span>
            <span>৳{total.toLocaleString()}</span>
          </div>
        </div>
      )}

      {mutation.error && (
        <p className="text-sm text-red-500 text-center">{(mutation.error as Error).message}</p>
      )}

      <button
        type="submit"
        disabled={mutation.isPending}
        className="w-full rounded-xl py-3.5 text-base font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
        style={{ backgroundColor: accentColor }}
      >
        {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : ctaText}
      </button>
    </form>
  );
}
