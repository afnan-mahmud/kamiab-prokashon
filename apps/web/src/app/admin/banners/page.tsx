'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Images, Loader2, Upload, X, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { bannersApi } from '@/features/banners/banners.api';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Can } from '@/components/can';
import { ApiError, apiClient } from '@/lib/api-client';
import type { Banner, BannerImage } from '@kamiab/types';

// ── Schema ────────────────────────────────────────────────────────────────────

const bannerImageSchema = z.object({
  url: z.string().min(1),
  publicId: z.string().min(1),
});

// Keep image fields nullable in the schema so the form can hold null while
// the user hasn't uploaded yet. Presence is validated via superRefine.
const bannerFormSchema = z
  .object({
    desktopImage: bannerImageSchema.nullable(),
    mobileImage: bannerImageSchema.nullable(),
    title: z.string().optional(),
    link: z.string().optional(),
    order: z.coerce.number().min(0).default(0),
    isActive: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (!data.desktopImage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Desktop image is required',
        path: ['desktopImage'],
      });
    }
    if (!data.mobileImage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Mobile image is required',
        path: ['mobileImage'],
      });
    }
  });

type BannerFormValues = z.infer<typeof bannerFormSchema>;

// ── Single-image upload ───────────────────────────────────────────────────────

interface SingleImageUploadProps {
  label: string;
  value: BannerImage | null | undefined;
  onChange: (img: BannerImage | null) => void;
  error?: string;
}

function SingleImageUpload({ label, value, onChange, error }: SingleImageUploadProps) {
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
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {value ? (
        <div className="relative inline-block">
          <div className="relative h-24 w-40 overflow-hidden rounded-lg border border-border bg-muted">
            <Image src={value.url} alt={label} fill className="object-cover" sizes="160px" />
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
            {uploading ? 'Uploading...' : 'Click to upload'}
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
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── Form dialog ───────────────────────────────────────────────────────────────

interface BannerFormDialogProps {
  banner?: Banner;
  open: boolean;
  onClose: () => void;
}

function BannerFormDialog({ banner, open, onClose }: BannerFormDialogProps) {
  const qc = useQueryClient();
  const isEdit = !!banner;

  const defaultFormValues = (): BannerFormValues => ({
    desktopImage: banner?.desktopImage ?? null,
    mobileImage: banner?.mobileImage ?? null,
    title: banner?.title ?? '',
    link: banner?.link ?? '',
    order: banner?.order ?? 0,
    isActive: banner?.isActive ?? true,
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<BannerFormValues>({
    resolver: zodResolver(bannerFormSchema),
    defaultValues: defaultFormValues(),
  });

  useEffect(() => {
    reset(defaultFormValues());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banner]);

  const mutation = useMutation({
    mutationFn: (data: BannerFormValues) => {
      // zod refine ensures desktopImage/mobileImage are non-null here
      const payload = {
        desktopImage: data.desktopImage as BannerImage,
        mobileImage: data.mobileImage as BannerImage,
        title: data.title || undefined,
        link: data.link || undefined,
        order: data.order,
        isActive: data.isActive,
      };
      return isEdit
        ? bannersApi.update(banner!._id, payload)
        : bannersApi.create(payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? 'Banner updated' : 'Banner created');
      qc.invalidateQueries({ queryKey: ['banners'] });
      reset();
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save banner');
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Banner' : 'New Banner'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          {/* Desktop image */}
          <Controller
            control={control}
            name="desktopImage"
            render={({ field }) => (
              <SingleImageUpload
                label="Desktop image *"
                value={field.value}
                onChange={field.onChange}
                error={errors.desktopImage?.message}
              />
            )}
          />

          {/* Mobile image */}
          <Controller
            control={control}
            name="mobileImage"
            render={({ field }) => (
              <SingleImageUpload
                label="Mobile image *"
                value={field.value}
                onChange={field.onChange}
                error={errors.mobileImage?.message}
              />
            )}
          />

          {/* Title */}
          <div className="space-y-1.5">
            <Label>Title (optional)</Label>
            <Input {...register('title')} placeholder="Banner title" />
          </div>

          {/* Link */}
          <div className="space-y-1.5">
            <Label>Link (optional)</Label>
            <Input {...register('link')} placeholder="https://..." />
          </div>

          {/* Order */}
          <div className="space-y-1.5">
            <Label>Display order</Label>
            <Input type="number" min={0} {...register('order')} placeholder="0" />
            {errors.order && <p className="text-xs text-destructive">{errors.order.message}</p>}
          </div>

          {/* Active */}
          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch id="banner-isActive" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="banner-isActive" className="cursor-pointer">
              Active (visible on site)
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Create banner'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BannersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | undefined>();
  const qc = useQueryClient();

  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['banners'],
    queryFn: bannersApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: bannersApi.remove,
    onSuccess: () => {
      toast.success('Banner deleted');
      qc.invalidateQueries({ queryKey: ['banners'] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete banner');
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      bannersApi.update(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['banners'] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update');
    },
  });

  const openCreate = () => { setEditingBanner(undefined); setDialogOpen(true); };
  const openEdit = (b: Banner) => { setEditingBanner(b); setDialogOpen(true); };
  const handleDelete = (b: Banner) => {
    if (!confirm(`Delete banner "${b.title ?? 'this banner'}"? This cannot be undone.`)) return;
    deleteMutation.mutate(b._id);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Banners</h1>
          <p className="text-muted-foreground">Manage homepage banners</p>
        </div>
        <Can permission="banners.create">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Banner
          </Button>
        </Can>
      </div>

      <div className="rounded-xl border border-border bg-surface">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : banners.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Images className="mb-3 h-10 w-10 opacity-30" />
            <p>No banners yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {banners.map((banner) => (
                <TableRow key={banner._id}>
                  <TableCell>
                    <div className="relative h-12 w-20 overflow-hidden rounded border border-border bg-muted">
                      <Image
                        src={banner.desktopImage.url}
                        alt={banner.title ?? 'Banner'}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {banner.title ?? <span className="text-muted-foreground italic">Untitled</span>}
                    </span>
                    {banner.link && (
                      <p className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground">
                        {banner.link}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>{banner.order}</TableCell>
                  <TableCell>
                    <Can permission="banners.edit">
                      <Switch
                        checked={banner.isActive}
                        onCheckedChange={(v) => toggleActive.mutate({ id: banner._id, isActive: v })}
                        disabled={toggleActive.isPending}
                      />
                    </Can>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Can permission="banners.edit">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(banner)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Can>
                      <Can permission="banners.delete">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(banner)}
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

      <BannerFormDialog
        banner={editingBanner}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
