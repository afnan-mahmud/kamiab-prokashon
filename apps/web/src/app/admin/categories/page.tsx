'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, FolderTree, Loader2, Upload, X, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { categoriesApi } from '@/features/categories/categories.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Can } from '@/components/can';
import { ApiError, apiClient } from '@/lib/api-client';
import type { Category, CategoryImage } from '@kamiab/types';

// ── Slugify ──────────────────────────────────────────────────────────────────

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ── Schema ───────────────────────────────────────────────────────────────────

const categoryFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
  parent: z.string().nullable(),
  image: z
    .object({ url: z.string(), publicId: z.string() })
    .nullable()
    .optional(),
  order: z.coerce.number().min(0).default(0),
  isActive: z.boolean(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

// ── Single-image uploader (mirrors ImageUploader but for one image) ──────────

interface SingleImageUploadProps {
  value: CategoryImage | null | undefined;
  onChange: (img: CategoryImage | null) => void;
}

function SingleImageUpload({ value, onChange }: SingleImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const result = await apiClient.upload<{ url: string; publicId: string }>('/admin/upload', fd);
        onChange({ url: result.url, publicId: result.publicId });
        toast.success('Image uploaded');
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'Upload failed');
      } finally {
        setUploading(false);
      }
    },
    [onChange],
  );

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative inline-block">
          <div className="relative h-24 w-24 overflow-hidden rounded-lg border border-border bg-muted">
            <Image src={value.url} alt="Category image" fill className="object-cover" sizes="96px" />
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute -right-1.5 -top-1.5 rounded-full bg-destructive p-0.5 text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div
          className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border py-6 hover:border-primary/50"
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
          <p className="text-xs text-muted-foreground">
            {uploading ? 'Uploading...' : 'Click to upload image (optional)'}
          </p>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />
      {!value && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          {uploading ? 'Uploading...' : 'Upload image'}
        </Button>
      )}
    </div>
  );
}

// ── Form dialog ───────────────────────────────────────────────────────────────

interface CategoryFormDialogProps {
  category?: Category;
  allCategories: Category[];
  open: boolean;
  onClose: () => void;
}

function CategoryFormDialog({ category, allCategories, open, onClose }: CategoryFormDialogProps) {
  const qc = useQueryClient();
  const isEdit = !!category;

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category?.name ?? '',
      slug: category?.slug ?? '',
      parent: category?.parent ?? null,
      image: category?.image ?? null,
      order: category?.order ?? 0,
      isActive: category?.isActive ?? true,
    },
  });

  // Re-populate when switching between edit targets
  useEffect(() => {
    reset({
      name: category?.name ?? '',
      slug: category?.slug ?? '',
      parent: category?.parent ?? null,
      image: category?.image ?? null,
      order: category?.order ?? 0,
      isActive: category?.isActive ?? true,
    });
  }, [category, reset]);

  const name = watch('name');
  const slug = watch('slug');

  // Auto-generate slug from name when creating
  useEffect(() => {
    if (!isEdit && name) {
      setValue('slug', slugify(name), { shouldValidate: true });
    }
  }, [name, isEdit, setValue]);

  const mutation = useMutation({
    mutationFn: (data: CategoryFormValues) => {
      const payload = {
        name: data.name,
        slug: data.slug,
        parent: data.parent ?? null,
        image: data.image ?? null,
        order: data.order,
        isActive: data.isActive,
      };
      return isEdit
        ? categoriesApi.update(category!._id, payload)
        : categoriesApi.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Category updated' : 'Category created');
      qc.invalidateQueries({ queryKey: ['categories'] });
      reset();
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save category');
    },
  });

  // Parent options — exclude self (and its descendants would need recursive exclusion,
  // but for simplicity exclude the category being edited)
  const parentOptions = allCategories.filter((c) => c._id !== category?._id);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Category' : 'New Category'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input {...register('name')} placeholder="e.g. Fiction" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <Label>Slug *</Label>
            <Input
              {...register('slug')}
              placeholder="e.g. fiction"
              className="font-mono text-sm"
            />
            {slug && (
              <p className="text-xs text-muted-foreground">/categories/{slug}</p>
            )}
            {errors.slug && <p className="text-xs text-destructive">{errors.slug.message}</p>}
          </div>

          {/* Parent */}
          <div className="space-y-1.5">
            <Label>Parent category</Label>
            <Controller
              control={control}
              name="parent"
              render={({ field }) => (
                <Select
                  value={field.value ?? '__none__'}
                  onValueChange={(v) => field.onChange(v === '__none__' ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None (top level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None (top level)</SelectItem>
                    {parentOptions.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Image */}
          <div className="space-y-1.5">
            <Label>Image (optional)</Label>
            <Controller
              control={control}
              name="image"
              render={({ field }) => (
                <SingleImageUpload
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          {/* Order */}
          <div className="space-y-1.5">
            <Label>Display order</Label>
            <Input
              type="number"
              min={0}
              {...register('order')}
              placeholder="0"
            />
            {errors.order && <p className="text-xs text-destructive">{errors.order.message}</p>}
          </div>

          {/* Active */}
          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch id="cat-isActive" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="cat-isActive" className="cursor-pointer">
              Active (visible on site)
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Create category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>();
  const qc = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: categoriesApi.remove,
    onSuccess: () => {
      toast.success('Category deleted');
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 409) {
        toast.error(err.message);
      } else {
        toast.error(err instanceof ApiError ? err.message : 'Failed to delete category');
      }
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      categoriesApi.update(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update');
    },
  });

  const openCreate = () => { setEditingCategory(undefined); setDialogOpen(true); };
  const openEdit = (cat: Category) => { setEditingCategory(cat); setDialogOpen(true); };

  const handleDelete = (cat: Category) => {
    if (!confirm(`Delete category "${cat.name}"? This cannot be undone.`)) return;
    deleteMutation.mutate(cat._id);
  };

  // Render roots then their children (one level of indentation)
  const roots = categories.filter((c) => !c.parent);
  const childrenOf = (id: string) => categories.filter((c) => c.parent === id);

  const flatRows: Array<{ cat: Category; isChild: boolean }> = [];
  for (const root of roots) {
    flatRows.push({ cat: root, isChild: false });
    for (const child of childrenOf(root._id)) {
      flatRows.push({ cat: child, isChild: true });
    }
  }
  // Also include orphaned children (parent deleted) at the end without indentation
  const renderedIds = new Set(flatRows.map((r) => r.cat._id));
  for (const cat of categories) {
    if (!renderedIds.has(cat._id)) {
      flatRows.push({ cat, isChild: false });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-muted-foreground">Manage product categories</p>
        </div>
        <Can permission="categories.create">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Category
          </Button>
        </Can>
      </div>

      <div className="rounded-xl border border-border bg-surface">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : flatRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <FolderTree className="mb-3 h-10 w-10 opacity-30" />
            <p>No categories yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flatRows.map(({ cat, isChild }) => (
                <TableRow key={cat._id}>
                  <TableCell>
                    <span className={isChild ? 'pl-6' : ''}>
                      {isChild && (
                        <span className="mr-1.5 text-muted-foreground">↳</span>
                      )}
                      <span className="font-medium">{cat.name}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs text-muted-foreground">{cat.slug}</span>
                  </TableCell>
                  <TableCell>{cat.order}</TableCell>
                  <TableCell>
                    <Can permission="categories.edit">
                      <Switch
                        checked={cat.isActive}
                        onCheckedChange={(v) => toggleActive.mutate({ id: cat._id, isActive: v })}
                        disabled={toggleActive.isPending}
                      />
                    </Can>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Can permission="categories.edit">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(cat)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Can>
                      <Can permission="categories.delete">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(cat)}
                          disabled={deleteMutation.isPending}
                          className="text-destructive hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </Can>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <CategoryFormDialog
        category={editingCategory}
        allCategories={categories}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
