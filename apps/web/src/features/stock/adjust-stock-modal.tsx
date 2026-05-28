'use client';

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
import { Textarea } from '@/components/ui/textarea';
import { stockApi } from './stock.api';
import { productsApi } from '@/features/products/products.api';

const schema = z.object({
  productId: z.string().min(1, 'Select a product'),
  qty: z.coerce
    .number()
    .refine((n) => n !== 0, { message: 'Qty cannot be zero' }),
  note: z.string().min(1, 'Note is required'),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AdjustStockModal({ open, onClose }: Props) {
  const queryClient = useQueryClient();

  const { data: productsData } = useQuery({
    queryKey: ['admin-products-all'],
    queryFn: () => productsApi.list({ limit: 200 }),
    staleTime: 60_000,
  });

  const products = productsData?.data ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { productId: '', qty: 0, note: '' },
  });

  const watchedProductId = form.watch('productId');
  const currentProduct = products.find((p) => p._id === watchedProductId);

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      stockApi.adjust({
        productId: values.productId,
        qty: values.qty,
        note: values.note,
      }),
    onSuccess: () => {
      toast.success('Stock adjusted successfully');
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
          <DialogTitle>Adjust Stock</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="space-y-4 pt-2"
        >
          <div className="space-y-1.5">
            <Label>Product *</Label>
            <Select
              value={form.watch('productId')}
              onValueChange={(v) => form.setValue('productId', v)}
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

          {currentProduct && (
            <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
              Current pool stock:{' '}
              <span className="font-bold">{currentProduct.poolStock} kg</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>
              Quantity Change (kg) *{' '}
              <span className="text-xs text-muted-foreground">(positive = add, negative = remove)</span>
            </Label>
            <Input
              type="number"
              step="0.1"
              placeholder="+5 or -3"
              {...form.register('qty')}
            />
            {form.formState.errors.qty && (
              <p className="text-xs text-destructive">{form.formState.errors.qty.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Reason / Note *</Label>
            <Textarea
              rows={2}
              placeholder="Reason for adjustment..."
              {...form.register('note')}
            />
            {form.formState.errors.note && (
              <p className="text-xs text-destructive">{form.formState.errors.note.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Adjustment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
