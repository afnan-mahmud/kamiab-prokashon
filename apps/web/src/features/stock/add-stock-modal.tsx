'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { stockApi } from './stock.api';
import { productsApi } from '@/features/products/products.api';

const schema = z.object({
  productId: z.string().min(1, 'Select a product'),
  variantId: z.string().min(1, 'Select a variant'),
  qty: z.coerce.number().int().min(1, 'Qty must be at least 1'),
  unitCost: z.coerce.number().min(0).optional().or(z.literal('')).transform((v) => v === '' ? undefined : Number(v)),
  supplier: z.string().trim().optional(),
  purchaseDate: z.string().optional(),
  reference: z.string().trim().optional(),
  note: z.string().default(''),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  prefillProductId?: string;
  prefillVariantId?: string;
}

export function AddStockModal({ open, onClose, prefillProductId, prefillVariantId }: Props) {
  const queryClient = useQueryClient();
  const [selectedProductId, setSelectedProductId] = useState(prefillProductId ?? '');

  const { data: productsData } = useQuery({
    queryKey: ['admin-products-all'],
    queryFn: () => productsApi.list({ limit: 200 }),
    staleTime: 60_000,
  });

  const products = productsData?.data ?? [];
  const selectedProduct = products.find((p) => p._id === selectedProductId);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      productId: prefillProductId ?? '',
      variantId: prefillVariantId ?? '',
      qty: 1,
      note: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      stockApi.addStock({
        productId: values.productId,
        variantId: values.variantId,
        qty: values.qty,
        unitCost: values.unitCost as number | undefined,
        supplier: values.supplier,
        purchaseDate: values.purchaseDate,
        reference: values.reference,
        note: values.note,
      }),
    onSuccess: () => {
      toast.success('Stock added successfully');
      void queryClient.invalidateQueries({ queryKey: ['stock-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-products-all'] });
      form.reset();
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Stock (Purchase Receipt)</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="space-y-4 pt-2"
        >
          <div className="space-y-1.5">
            <Label>Product *</Label>
            <Select
              value={form.watch('productId')}
              onValueChange={(v) => {
                setSelectedProductId(v);
                form.setValue('productId', v);
                form.setValue('variantId', '');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.productId && (
              <p className="text-xs text-destructive">{form.formState.errors.productId.message}</p>
            )}
          </div>

          {selectedProduct && (
            <div className="space-y-1.5">
              <Label>Variant *</Label>
              <Select
                value={form.watch('variantId')}
                onValueChange={(v) => form.setValue('variantId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a variant" />
                </SelectTrigger>
                <SelectContent>
                  {selectedProduct.variants.map((v) => (
                    <SelectItem key={v._id} value={v._id}>
                      {v.label} — Stock: {v.stock}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.variantId && (
                <p className="text-xs text-destructive">{form.formState.errors.variantId.message}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Quantity *</Label>
              <Input type="number" min={1} {...form.register('qty')} />
              {form.formState.errors.qty && (
                <p className="text-xs text-destructive">{form.formState.errors.qty.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Unit Cost (optional)</Label>
              <Input type="number" min={0} step="0.01" placeholder="0.00" {...form.register('unitCost')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Supplier (optional)</Label>
            <Input placeholder="e.g. Rangpur Farm" {...form.register('supplier')} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Purchase Date (optional)</Label>
              <Input type="date" {...form.register('purchaseDate')} />
            </div>
            <div className="space-y-1.5">
              <Label>Lot / Reference (optional)</Label>
              <Input placeholder="LOT-001" {...form.register('reference')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Note (optional)</Label>
            <Input placeholder="Additional info..." {...form.register('note')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Stock
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
