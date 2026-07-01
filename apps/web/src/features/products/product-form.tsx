'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2, GripVertical, Truck, FileText, X, Loader2, Upload } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUploader } from '@/components/admin/image-uploader';
import { ApiError, apiClient } from '@/lib/api-client';
import { categoriesApi } from '@/features/categories/categories.api';
import { authorsApi } from '@/features/authors/authors.api';
import { publishersApi } from '@/features/publishers/publishers.api';
import type { Product, ProductImage, PreviewPdf } from '@kamiab/types';

// ── Schema ──────────────────────────────────────────────────────────────────

const customDeliverySchema = z.object({
  insideDhaka: z.coerce.number().min(0, 'Must be ≥ 0').default(0),
  outsideDhaka: z.coerce.number().min(0, 'Must be ≥ 0').default(0),
});

const variantSchema = z.object({
  _id: z.string().optional(),
  label: z.string().min(1, 'Label required'),
  price: z.coerce.number().min(0, 'Price must be ≥ 0'),
  regularPrice: z.coerce.number().min(0).optional(),
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
  // Book details (all optional)
  author: z.string().optional(),
  publisher: z.string().optional(),
  translator: z.string().optional(),
  language: z.string().optional(),
  binding: z.string().optional(),
  edition: z.string().optional(),
  isbn: z.string().optional(),
  pages: z.coerce.number().min(0).optional(),
  publicationYear: z.coerce.number().min(0).optional(),
  // Preview
  previewImages: z.array(
    z.object({ url: z.string(), publicId: z.string(), alt: z.string() }),
  ).optional(),
  previewPdf: z
    .object({ url: z.string(), publicId: z.string() })
    .nullable()
    .optional(),
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
  // \w only matches [A-Za-z0-9_], so a pure-Bengali name strips down to "".
  // Keep the ASCII-derived slug when possible, otherwise fall back to a
  // unique editable slug so Bengali-named books still pass validation.
  const ascii = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (ascii) return ascii;
  // Stable per-name fallback (no flicker while typing a Bengali name).
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return `book-${hash.toString(36)}`;
}

function defaultVariant() {
  return { label: '', price: 0, regularPrice: undefined, sku: '', weight: 0, isDefault: false };
}

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

// ── PDF uploader ─────────────────────────────────────────────────────────────

interface PdfUploaderProps {
  value: PreviewPdf | null | undefined;
  onChange: (pdf: PreviewPdf | null) => void;
}

function PdfUploader({ value, onChange }: PdfUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const result = await apiClient.upload<{ url: string; publicId: string }>('/admin/upload/pdf', fd);
        onChange({ url: result.url, publicId: result.publicId });
        toast.success('PDF uploaded');
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'PDF upload failed');
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2">
        <FileText className="h-5 w-5 text-primary" />
        <a
          href={value.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 truncate text-sm text-primary underline"
        >
          View PDF
        </a>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="rounded p-0.5 text-muted-foreground hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border py-5 hover:border-primary/50"
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : (
          <FileText className="h-6 w-6 text-muted-foreground" />
        )}
        <p className="text-xs text-muted-foreground">
          {uploading ? 'Uploading...' : 'Click to upload PDF (max 20 MB)'}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        <Upload className="mr-1.5 h-3.5 w-3.5" />
        {uploading ? 'Uploading...' : 'Upload PDF'}
      </Button>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

interface ProductFormProps {
  product?: Product;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  isSubmitting: boolean;
}

export function ProductForm({ product, onSubmit, isSubmitting }: ProductFormProps) {
  // Category list from the dedicated categories endpoint
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
    staleTime: 60_000,
  });

  // Author & publisher lists (managed collections, selected by name on the product)
  const { data: authors = [] } = useQuery({
    queryKey: ['authors'],
    queryFn: authorsApi.list,
    staleTime: 60_000,
  });
  const { data: publishers = [] } = useQuery({
    queryKey: ['publishers'],
    queryFn: publishersApi.list,
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
          author: product.author ?? '',
          publisher: product.publisher ?? '',
          translator: product.translator ?? '',
          language: product.language ?? '',
          binding: product.binding ?? '',
          edition: product.edition ?? '',
          isbn: product.isbn ?? '',
          pages: product.pages,
          publicationYear: product.publicationYear,
          previewImages: product.previewImages ?? [],
          previewPdf: product.previewPdf ?? null,
          variants: product.variants.map((v) => ({
            _id: v._id,
            label: v.label,
            price: v.price,
            regularPrice: v.regularPrice,
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
          author: '',
          publisher: '',
          translator: '',
          language: '',
          binding: '',
          edition: '',
          isbn: '',
          pages: undefined,
          publicationYear: undefined,
          previewImages: [],
          previewPdf: null,
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

  // Build flattened category options: roots first, then children indented
  const rootCategories = categories.filter((c) => !c.parent && c.isActive);
  const childrenOf = (id: string) => categories.filter((c) => c.parent === id && c.isActive);

  const categoryOptions: Array<{ value: string; label: string }> = [];
  for (const root of rootCategories) {
    categoryOptions.push({ value: root.slug, label: root.name });
    for (const child of childrenOf(root._id)) {
      categoryOptions.push({ value: child.slug, label: `  ↳ ${child.name}` });
    }
  }
  // Also include any active categories not yet parented in the above tree
  const coveredSlugs = new Set(categoryOptions.map((o) => o.value));
  for (const cat of categories) {
    if (cat.isActive && !coveredSlugs.has(cat.slug)) {
      categoryOptions.push({ value: cat.slug, label: cat.name });
    }
  }

  // Author/publisher options — active managed names, plus the product's current
  // value if it's a legacy/free-text name not in the active list (so it's preserved).
  const currentAuthor = watch('author');
  const currentPublisher = watch('publisher');
  const authorOptions = authors.filter((a) => a.isActive).map((a) => a.name);
  if (currentAuthor && !authorOptions.includes(currentAuthor)) authorOptions.unshift(currentAuthor);
  const publisherOptions = publishers.filter((p) => p.isActive).map((p) => p.name);
  if (currentPublisher && !publisherOptions.includes(currentPublisher)) {
    publisherOptions.unshift(currentPublisher);
  }

  const handleFormSubmit = handleSubmit(
    async (values) => {
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
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
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

      {/* Book details */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Book Details</h2>
        <p className="text-xs text-muted-foreground">All fields optional — fill in for books</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="author">Author</Label>
            <Controller
              control={control}
              name="author"
              render={({ field }) => (
                <Select
                  value={field.value || '__none__'}
                  onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                >
                  <SelectTrigger id="author">
                    <SelectValue placeholder="Select an author" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {authorOptions.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {authorOptions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No authors yet — add them in Admin → Authors.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="publisher">Publisher</Label>
            <Controller
              control={control}
              name="publisher"
              render={({ field }) => (
                <Select
                  value={field.value || '__none__'}
                  onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                >
                  <SelectTrigger id="publisher">
                    <SelectValue placeholder="Select a publisher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {publisherOptions.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {publisherOptions.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No publishers yet — add them in Admin → Publishers.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="translator">Translator</Label>
            <Input id="translator" {...register('translator')} placeholder="e.g. Translator name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="language">Language</Label>
            <Input id="language" {...register('language')} placeholder="e.g. Bengali" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="binding">Binding</Label>
            <Input id="binding" {...register('binding')} placeholder="e.g. Hardcover" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edition">Edition</Label>
            <Input id="edition" {...register('edition')} placeholder="e.g. 2nd Edition" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="isbn">ISBN</Label>
            <Input id="isbn" {...register('isbn')} placeholder="e.g. 978-3-16-148410-0" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pages">Pages</Label>
            <Input
              id="pages"
              type="number"
              min={0}
              {...register('pages')}
              placeholder="e.g. 320"
            />
            {errors.pages && <p className="text-xs text-destructive">{errors.pages.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="publicationYear">Publication Year</Label>
            <Input
              id="publicationYear"
              type="number"
              min={0}
              {...register('publicationYear')}
              placeholder="e.g. 2023"
            />
            {errors.publicationYear && (
              <p className="text-xs text-destructive">{errors.publicationYear.message}</p>
            )}
          </div>
        </div>
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
                    <Label className="text-xs">MRP / Regular Price (BDT)</Label>
                    <Input
                      {...register(`variants.${idx}.regularPrice`)}
                      type="number"
                      min={0}
                      placeholder="0 (optional)"
                      className="h-8 text-sm"
                    />
                    {errors.variants?.[idx]?.regularPrice && (
                      <p className="text-xs text-destructive">
                        {errors.variants[idx]?.regularPrice?.message}
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

      {/* Preview section */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Read a Little (Preview)</h2>
        <p className="text-xs text-muted-foreground">
          Optional preview images and/or a sample PDF chapter for customers to browse before buying.
        </p>

        <div className="space-y-2">
          <Label>Preview Images (optional)</Label>
          <Controller
            control={control}
            name="previewImages"
            render={({ field }) => (
              <ImageUploader
                images={field.value ?? []}
                onChange={(imgs: ProductImage[]) => field.onChange(imgs)}
                maxImages={10}
              />
            )}
          />
        </div>

        <div className="space-y-2">
          <Label>Preview PDF (optional)</Label>
          <Controller
            control={control}
            name="previewPdf"
            render={({ field }) => (
              <PdfUploader value={field.value} onChange={field.onChange} />
            )}
          />
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
