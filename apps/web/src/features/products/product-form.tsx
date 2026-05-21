'use client';

import { useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ImageUploader } from '@/components/admin/image-uploader';
import { productsApi } from './products.api';
import type { Product } from '@cholonbil/types';

// ── Schema ──────────────────────────────────────────────────────────────────

const variantSchema = z.object({
  _id: z.string().optional(),
  label: z.string().min(1, 'Label required'),
  price: z.coerce.number().min(0, 'Price must be ≥ 0'),
  stock: z.coerce.number().int().min(0, 'Stock must be ≥ 0'),
  sku: z.string().default(''),
  weight: z.coerce.number().min(0, 'Weight must be ≥ 0'),
  isDefault: z.boolean(),
  reorderPoint: z.coerce.number().int().min(0).default(0),
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
  return { label: '', price: 0, stock: 0, sku: '', weight: 0, isDefault: false, reorderPoint: 0 };
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
            stock: v.stock,
            sku: v.sku,
            weight: v.weight,
            isDefault: v.isDefault,
            reorderPoint: v.reorderPoint ?? 0,
          })),
          isActive: product.isActive,
        }
      : {
          name: '',
          slug: '',
          description: '',
          category: '',
          images: [],
          variants: [{ ...defaultVariant(), isDefault: true }],
          isActive: true,
        },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'variants' });

  const name = watch('name');
  const slug = watch('slug');
  const variants = watch('variants');

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

  const handleFormSubmit = handleSubmit(async (values) => {
    try {
      await onSubmit(values);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      toast.error(msg);
    }
  });

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
                  {product && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Current Stock</Label>
                      <div className="flex h-8 items-center rounded-md border border-border bg-muted/40 px-3 text-sm text-muted-foreground">
                        {variants[idx]?.stock ?? 0} units
                      </div>
                    </div>
                  )}
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
                  <div className="space-y-1.5">
                    <Label className="text-xs">Low Stock Alert</Label>
                    <Input
                      {...register(`variants.${idx}.reorderPoint`)}
                      type="number"
                      min={0}
                      placeholder="0"
                      className="h-8 text-sm"
                      title="Low stock alert threshold. 0 = no alert."
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

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
