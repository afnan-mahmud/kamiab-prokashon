'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, PenLine, Loader2 } from 'lucide-react';
import { authorsApi } from '@/features/authors/authors.api';
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
import type { Author } from '@kamiab/types';

const authorFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  bio: z.string().default(''),
  image: z.object({ url: z.string(), publicId: z.string() }).nullable().optional(),
  order: z.coerce.number().min(0).default(0),
  isActive: z.boolean(),
});

type AuthorFormValues = z.infer<typeof authorFormSchema>;

interface AuthorFormDialogProps {
  author?: Author;
  open: boolean;
  onClose: () => void;
}

function AuthorFormDialog({ author, open, onClose }: AuthorFormDialogProps) {
  const qc = useQueryClient();
  const isEdit = !!author;

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AuthorFormValues>({
    resolver: zodResolver(authorFormSchema),
    defaultValues: {
      name: author?.name ?? '',
      bio: author?.bio ?? '',
      image: author?.image ?? null,
      order: author?.order ?? 0,
      isActive: author?.isActive ?? true,
    },
  });

  useEffect(() => {
    reset({
      name: author?.name ?? '',
      bio: author?.bio ?? '',
      image: author?.image ?? null,
      order: author?.order ?? 0,
      isActive: author?.isActive ?? true,
    });
  }, [author, reset]);

  const mutation = useMutation({
    mutationFn: (data: AuthorFormValues) =>
      isEdit ? authorsApi.update(author!._id, data) : authorsApi.create(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Author updated' : 'Author created');
      qc.invalidateQueries({ queryKey: ['authors'] });
      reset();
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save author');
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Author' : 'New Author'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input {...register('name')} placeholder="e.g. হুমায়ূন আহমেদ" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Photo (optional)</Label>
            <Controller
              control={control}
              name="image"
              render={({ field }) => (
                <SingleImageUpload value={field.value} onChange={field.onChange} label="author photo" />
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Bio (optional)</Label>
            <Textarea {...register('bio')} rows={4} placeholder="লেখক সম্পর্কে সংক্ষিপ্ত পরিচিতি..." />
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
                <Switch id="author-isActive" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="author-isActive" className="cursor-pointer">
              Active (selectable on products)
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Create author'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AuthorsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Author | undefined>();
  const qc = useQueryClient();

  const { data: authors = [], isLoading } = useQuery({
    queryKey: ['authors'],
    queryFn: authorsApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: authorsApi.remove,
    onSuccess: () => {
      toast.success('Author deleted');
      qc.invalidateQueries({ queryKey: ['authors'] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete author');
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      authorsApi.update(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['authors'] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to update');
    },
  });

  const openCreate = () => { setEditing(undefined); setDialogOpen(true); };
  const openEdit = (a: Author) => { setEditing(a); setDialogOpen(true); };

  const handleDelete = (a: Author) => {
    if (!confirm(`Delete author "${a.name}"? This cannot be undone.`)) return;
    deleteMutation.mutate(a._id);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Authors</h1>
          <p className="text-muted-foreground">Manage book authors (লেখক)</p>
        </div>
        <Can permission="authors.create">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Author
          </Button>
        </Can>
      </div>

      <div className="rounded-xl border border-border bg-surface">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : authors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <PenLine className="mb-3 h-10 w-10 opacity-30" />
            <p>No authors yet</p>
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
              {authors.map((a) => (
                <TableRow key={a._id}>
                  <TableCell><span className="font-medium">{a.name}</span></TableCell>
                  <TableCell>{a.order}</TableCell>
                  <TableCell>
                    <Can permission="authors.edit">
                      <Switch
                        checked={a.isActive}
                        onCheckedChange={(v) => toggleActive.mutate({ id: a._id, isActive: v })}
                        disabled={toggleActive.isPending}
                      />
                    </Can>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Can permission="authors.edit">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(a)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Can>
                      <Can permission="authors.delete">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(a)}
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

      <AuthorFormDialog author={editing} open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  );
}
