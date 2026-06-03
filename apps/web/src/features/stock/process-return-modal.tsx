'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ordersApi } from '@/features/orders/orders.api';
import type { Order } from '@sodaikini/types';

const schema = z.object({
  items: z.array(
    z.object({
      variantId: z.string(),
      productName: z.string(),
      variantLabel: z.string(),
      orderedQty: z.number(),
      resalableQty: z.coerce.number().int().min(0),
      damagedQty: z.coerce.number().int().min(0),
    }).refine(
      (item) => item.resalableQty + item.damagedQty <= item.orderedQty,
      { message: 'Resalable + Damaged cannot exceed ordered qty', path: ['resalableQty'] },
    ),
  ),
  note: z.string().default(''),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  order: Order;
}

export function ProcessReturnModal({ open, onClose, order }: Props) {
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      items: order.items.map((item) => ({
        variantId: item.variantId,
        productName: item.productName,
        variantLabel: item.variantLabel,
        orderedQty: item.quantity,
        resalableQty: 0,
        damagedQty: 0,
      })),
      note: '',
    },
  });

  const { fields } = useFieldArray({ control: form.control, name: 'items' });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      ordersApi.processReturn(order._id, {
        items: values.items.map((item) => ({
          variantId: item.variantId,
          resalableQty: item.resalableQty,
          damagedQty: item.damagedQty,
        })),
        note: values.note,
      }),
    onSuccess: () => {
      toast.success('Return processed successfully');
      void queryClient.invalidateQueries({ queryKey: ['admin-order', order._id] });
      void queryClient.invalidateQueries({ queryKey: ['stock-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Process Courier Return</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
          className="space-y-4 pt-2"
        >
          <p className="text-sm text-muted-foreground">
            Enter the resalable and damaged quantity for each item.
          </p>

          <div className="space-y-3">
            {fields.map((field, idx) => {
              const item = form.watch(`items.${idx}`);
              return (
                <div key={field.id} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.variantLabel} · Ordered: {item.orderedQty}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-green-700">Resalable</Label>
                      <Input
                        type="number"
                        min={0}
                        max={item.orderedQty}
                        className="h-8 text-sm"
                        {...form.register(`items.${idx}.resalableQty`)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-red-700">Damaged</Label>
                      <Input
                        type="number"
                        min={0}
                        max={item.orderedQty}
                        className="h-8 text-sm"
                        {...form.register(`items.${idx}.damagedQty`)}
                      />
                    </div>
                  </div>
                  {form.formState.errors.items?.[idx]?.resalableQty && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.items[idx]?.resalableQty?.message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-1.5">
            <Label>Note (optional)</Label>
            <Textarea rows={2} placeholder="Reason for return..." {...form.register('note')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Return
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
