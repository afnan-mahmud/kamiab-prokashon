'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Building2, Loader2 } from 'lucide-react';
import { publishersApi } from '@/features/publishers/publishers.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { SingleImageUpload } from '@/components/admin/single-image-upload';
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
import { ApiError } from '@/lib/api-client';
import type { Publisher } from '@kamiab/types';

const publisherFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  bio: z.string().default(''),
  image: z.object({ url: z.string(), publicId: z.string() }).nullable().optional(),
  order: z.coerce.number().min(0).default(0),
  isActive: z.boolean(),
});

type PublisherFormValues = z.infer<typeof publisherFormSchema>;

interface PublisherFormDialogProps {
  publisher?: Publisher;
  open: boolean;
  onClose: () => void;
}

function PublisherFormDialog({ publisher, open, onClose }: PublisherFormDialogProps) {
  const qc = useQueryClient();
  const isEdit = !!publisher;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PublisherFormValues>({
    resolver: zodResolver(publisherFormSchema),
    defaultValues: {
      name: publisher?.name ?? '',
      bio: publisher?.bio ?? '',
      image: publisher?.image ?? null,
      order: publisher?.order ?? 0,
      isActive: publisher?.isActive ?? true,
    },
  });

  useEffect(() => {
    reset({
      name: publisher?.name ?? '',
      bio: publisher?.bio ?? '',
      image: publisher?.image ?? null,
      order: publisher?.order ?? 0,
      isActive: publisher?.isActive ?? true,
    });
  }, [publisher, reset]);

  const mutation = useMutation({
    mutationFn: (data: PublisherFormValues) =>
      isEdit ? publishersApi.update(publisher!._id, data) : publishersApi.create(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Publisher updated' : 'Publisher created');
      qc.invalidateQueries({ queryKey: ['publishers'] });
      reset();
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save publisher');
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Publisher' : 'New Publisher'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input {...register('name')} placeholder="e.g. অন্যপ্রকাশ" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Logo (optional)</Label>
            <Controller
              control={control}
              name="image"
              render={({ field }) => (
                <SingleImageUpload value={field.value} onChange={field.onChange} label="publisher logo" />
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Bio (optional)</Label>
            <Textarea {...register('bio')} rows={4} placeholder="প্রকাশনী সম্পর্কে সংক্ষিপ্ত পরিচিতি..." />
          </div>

          <div className="space-y-1.5">
            <Label>Display order</Label>
            <Input type="number" min={0} {...register('order')} placeholder="0" />
            {errors.order && <p className="text-xs text-destructive">{errors.order.message}</p>}
          </div>

          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch id="pub-isActive" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="pub-isActive" className="cursor-pointer">
              Active (selectable on products)
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Create publisher'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function PublishersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Publisher | undefined>();
  const qc = useQueryClient();

  const { data: publishers = [], isLoading } = useQuery({
    queryKey: ['publishers'],
    queryFn: publishersApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: publishersApi.remove,
    onSuccess: () => {
      toast.success('Publisher deleted');
      qc.invalidateQueries({ queryKey: ['publishers'] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete publisher');
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      publishersApi.update(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['publishers'] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update');
    },
  });

  const openCreate = () => { setEditing(undefined); setDialogOpen(true); };
  const openEdit = (p: Publisher) => { setEditing(p); setDialogOpen(true); };

  const handleDelete = (p: Publisher) => {
    if (!confirm(`Delete publisher "${p.name}"? This cannot be undone.`)) return;
    deleteMutation.mutate(p._id);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Publishers</h1>
          <p className="text-muted-foreground">Manage book publishers (প্রকাশনী)</p>
        </div>
        <Can permission="publishers.create">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Publisher
          </Button>
        </Can>
      </div>

      <div className="rounded-xl border border-border bg-surface">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : publishers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Building2 className="mb-3 h-10 w-10 opacity-30" />
            <p>No publishers yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {publishers.map((p) => (
                <TableRow key={p._id}>
                  <TableCell><span className="font-medium">{p.name}</span></TableCell>
                  <TableCell>{p.order}</TableCell>
                  <TableCell>
                    <Can permission="publishers.edit">
                      <Switch
                        checked={p.isActive}
                        onCheckedChange={(v) => toggleActive.mutate({ id: p._id, isActive: v })}
                        disabled={toggleActive.isPending}
                      />
                    </Can>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Can permission="publishers.edit">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Can>
                      <Can permission="publishers.delete">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(p)}
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

      <PublisherFormDialog publisher={editing} open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
