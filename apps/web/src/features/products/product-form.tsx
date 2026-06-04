'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, GripVertical, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ImageUploader } from '@/components/admin/image-uploader';
import { productsApi } from './products.api';
import type { Product } from '@shukhilife/types';

// ── Schema ──────────────────────────────────────────────────────────────────

// Inner fields default to 0 so an empty/partial object coming back from the API
// (e.g. `{}` or a half-filled charge) coerces cleanly instead of producing NaN
// and silently blocking the whole form submit.
const customDeliverySchema = z.object({
  insideDhaka: z.coerce.number().min(0, 'Must be ≥ 0').default(0),
  outsideDhaka: z.coerce.number().min(0, 'Must be ≥ 0').default(0),
});

const variantSchema = z.object({
  _id: z.string().optional(),
  label: z.string().min(1, 'Label required'),
  price: z.coerce.number().min(0, 'Price must be ≥ 0'),
  sku: z.string().default(''),
  weight: z.coerce.number().min(0, 'Weight must be ≥ 0'),
  isDefault: z.boolean(),
  customDelivery: customDeliverySchema.optional(),
});

const productFormSchema = z.object({
  name: z.string().min(1, 'Name required'),
  slug: z.string().min(1, 'Slug required').regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
  description: z.string().default(''),
  category: z.string().min(1, 'Category required'),
  images: z.array(
    z.object({ url: z.string(), publicId: z.string(), alt: z.string() }),
  ),
  variants: z
    .array(variantSchema)
    .min(1, 'At least one variant required')
    .refine((vs) => vs.filter((v) => v.isDefault).length === 1, {
      message: 'Exactly one variant must be marked as default',
    }),
  poolStock: z.coerce.number().min(0).default(0),
  reorderPoint: z.coerce.number().min(0).default(0),
  customDeliveryEnabled: z.boolean().default(false),
  isActive: z.boolean(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function defaultVariant() {
  return { label: '', price: 0, sku: '', weight: 0, isDefault: false };
}

// Walks the react-hook-form errors tree (which is nested for arrays/objects)
// and returns the first human-readable message, so a failed submit always
// surfaces a reason instead of the button appearing to do nothing.
function firstErrorMessage(errors: unknown): string | undefined {
  if (!errors || typeof errors !== 'object') return undefined;
  const record = errors as Record<string, unknown>;
  if (typeof record['message'] === 'string' && record['message']) {
    return record['message'];
  }
  for (const value of Object.values(record)) {
    const nested = firstErrorMessage(value);
    if (nested) return nested;
  }
  return undefined;
}

// ── Component ────────────────────────────────────────────────────────────────

interface ProductFormProps {
  product?: Product;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  isSubmitting: boolean;
}

export function ProductForm({ product, onSubmit, isSubmitting }: ProductFormProps) {
  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories'],
    queryFn: () => productsApi.categories(),
    staleTime: 60_000,
  });

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product
      ? {
          name: product.name,
          slug: product.slug,
          description: product.description,
          category: product.category,
          images: product.images,
          variants: product.variants.map((v) => ({
            _id: v._id,
            label: v.label,
            price: v.price,
            sku: v.sku,
            weight: v.weight,
            isDefault: v.isDefault,
            customDelivery: v.customDelivery,
          })),
          poolStock: product.poolStock ?? 0,
          reorderPoint: product.reorderPoint ?? 0,
          customDeliveryEnabled: product.customDeliveryEnabled ?? false,
          isActive: product.isActive,
        }
      : {
          name: '',
          slug: '',
          description: '',
          category: '',
          images: [],
          variants: [{ ...defaultVariant(), isDefault: true }],
          poolStock: 0,
          reorderPoint: 0,
          customDeliveryEnabled: false,
          isActive: true,
        },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'variants' });

  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);

  const name = watch('name');
  const slug = watch('slug');
  const variants = watch('variants');
  const customDeliveryEnabled = watch('customDeliveryEnabled');

  // Toggle custom delivery: turning on initialises charges for every variant
  // (keeping any existing values) and opens the editor. Turning off keeps the
  // entered values in form state so they persist on save.
  const handleCustomDeliveryToggle = (on: boolean) => {
    setValue('customDeliveryEnabled', on);
    if (on) {
      fields.forEach((_, i) => {
        const existing = variants[i]?.customDelivery;
        setValue(`variants.${i}.customDelivery`, {
          insideDhaka: existing?.insideDhaka ?? 0,
          outsideDhaka: existing?.outsideDhaka ?? 0,
        });
      });
      setDeliveryModalOpen(true);
    }
  };

  // Auto-generate slug from name when creating (not editing)
  useEffect(() => {
    if (!product && name) {
      setValue('slug', toSlug(name), { shouldValidate: true });
    }
  }, [name, product, setValue]);

  const setDefault = (idx: number) => {
    fields.forEach((_, i) => {
      setValue(`variants.${i}.isDefault`, i === idx);
    });
  };

  const handleFormSubmit = handleSubmit(
    async (values) => {
      // Only persist per-variant custom charges when the feature is enabled,
      // so disabled products don't carry stale {0,0} charges that would later
      // override the standard weight-based delivery calculation.
      const payload: ProductFormValues = {
        ...values,
        variants: values.variants.map((v) => ({
          ...v,
          customDelivery: values.customDeliveryEnabled ? v.customDelivery : undefined,
        })),
      };
      try {
        await onSubmit(payload);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Save failed';
        toast.error(msg);
      }
    },
    (formErrors) => {
      // Validation failed — never let the submit button look like a no-op.
      toast.error(firstErrorMessage(formErrors) ?? 'Please fix the highlighted fields before saving');
    },
  );

  return (
    <form onSubmit={handleFormSubmit} className="space-y-8">
      {/* Basic info */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Basic Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Product Name *</Label>
            <Input id="name" {...register('name')} placeholder="e.g. Organic Honey" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">URL Slug *</Label>
            <Input
              id="slug"
              {...register('slug')}
              placeholder="e.g. organic-honey"
              className="font-mono text-sm"
            />
            {slug && (
              <p className="text-xs text-muted-foreground">/products/{slug}</p>
            )}
            {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="category">Category *</Label>
            <Input
              id="category"
              {...register('category')}
              list="category-options"
              placeholder="e.g. Honey"
            />
            <datalist id="category-options">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {errors.category && (
              <p className="text-xs text-destructive">{errors.category.message}</p>
            )}
          </div>
          <div className="flex items-center gap-3 pt-7">
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch
                  id="isActive"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              Active (visible on site)
            </Label>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            {...register('description')}
            rows={4}
            placeholder="Describe the product..."
          />
        </div>
      </section>

      {/* Images */}
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Images</h2>
        <Controller
          control={control}
          name="images"
          render={({ field }) => (
            <ImageUploader images={field.value} onChange={field.onChange} />
          )}
        />
      </section>

      {/* Variants */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Variants *</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append(defaultVariant())}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Variant
          </Button>
        </div>

        {errors.variants?.root && (
          <p className="text-xs text-destructive">{errors.variants.root.message}</p>
        )}
        {typeof errors.variants?.message === 'string' && (
          <p className="text-xs text-destructive">{errors.variants.message}</p>
        )}

        <div className="space-y-3">
          {fields.map((field, idx) => {
            const isDefault = variants[idx]?.isDefault ?? false;
            return (
              <div
                key={field.id}
                className={`rounded-lg border p-4 transition-colors ${
                  isDefault ? 'border-primary/50 bg-primary/5' : 'border-border'
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Variant {idx + 1}</span>
                    {isDefault && (
                      <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        Default
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!isDefault && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setDefault(idx)}
                      >
                        Set Default
                      </Button>
                    )}
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => remove(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Label *</Label>
                    <Input
                      {...register(`variants.${idx}.label`)}
                      placeholder="e.g. ১ কেজি"
                      className="h-8 text-sm"
                    />
                    {errors.variants?.[idx]?.label && (
                      <p className="text-xs text-destructive">
                        {errors.variants[idx]?.label?.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Price (BDT) *</Label>
                    <Input
                      {...register(`variants.${idx}.price`)}
                      type="number"
                      min={0}
                      placeholder="0"
                      className="h-8 text-sm"
                    />
                    {errors.variants?.[idx]?.price && (
                      <p className="text-xs text-destructive">
                        {errors.variants[idx]?.price?.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Weight (kg) *</Label>
                    <Input
                      {...register(`variants.${idx}.weight`)}
                      type="number"
                      min={0}
                      step="0.1"
                      placeholder="0"
                      className="h-8 text-sm"
                    />
                    {errors.variants?.[idx]?.weight && (
                      <p className="text-xs text-destructive">
                        {errors.variants[idx]?.weight?.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">SKU</Label>
                    <Input
                      {...register(`variants.${idx}.sku`)}
                      placeholder="SKU-001"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Pool Stock (kg)</Label>
            <Input
              type="number"
              min={0}
              step="0.1"
              {...register('poolStock')}
            />
            <p className="text-xs text-muted-foreground">Total kg available across all variants</p>
            {errors.poolStock && (
              <p className="text-xs text-destructive">{errors.poolStock.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Reorder Point (kg)</Label>
            <Input
              type="number"
              min={0}
              step="0.1"
              {...register('reorderPoint')}
            />
            <p className="text-xs text-muted-foreground">Alert when stock falls below this</p>
            {errors.reorderPoint && (
              <p className="text-xs text-destructive">{errors.reorderPoint.message}</p>
            )}
          </div>
        </div>
      </section>

      {/* Custom delivery charge */}
      <section className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div className="flex items-start gap-3">
            <Truck className="mt-0.5 h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold">Custom Delivery Charge</p>
              <p className="text-xs text-muted-foreground">
                Set a fixed inside/outside Dhaka delivery charge per variant for this
                product (overrides the default weight-based charge).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {customDeliveryEnabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeliveryModalOpen(true)}
              >
                Edit charges
              </Button>
            )}
            <Switch
              checked={customDeliveryEnabled}
              onCheckedChange={handleCustomDeliveryToggle}
            />
          </div>
        </div>
      </section>

      <Dialog open={deliveryModalOpen} onOpenChange={setDeliveryModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Custom Delivery Charges</DialogTitle>
            <DialogDescription>
              Per-variant flat delivery charge (৳). The highest matching charge in an
              order wins; quantity and weight extras are not added.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[55vh] space-y-3 overflow-y-auto py-1">
            {fields.map((field, idx) => (
              <div key={field.id} className="rounded-lg border border-border p-3">
                <p className="mb-2 text-sm font-medium">
                  {variants[idx]?.label?.trim() || `Variant ${idx + 1}`}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Inside Dhaka (৳)</Label>
                    <Input
                      type="number"
                      min={0}
                      className="h-8 text-sm"
                      {...register(`variants.${idx}.customDelivery.insideDhaka`)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Outside Dhaka (৳)</Label>
                    <Input
                      type="number"
                      min={0}
                      className="h-8 text-sm"
                      {...register(`variants.${idx}.customDelivery.outsideDhaka`)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" onClick={() => setDeliveryModalOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock instruction */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <p className="font-medium">Need to add stock?</p>
        <p className="mt-0.5 text-blue-700">
          {product
            ? 'To update stock: Admin Panel → Stock → Add Stock (for purchases) or Adjust Stock'
            : 'After saving this product: Admin Panel → Stock → click Add Stock to add initial inventory'}
        </p>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3 border-t pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : product ? 'Update Product' : 'Create Product'}
        </Button>
      </div>
    </form>
  );
}
