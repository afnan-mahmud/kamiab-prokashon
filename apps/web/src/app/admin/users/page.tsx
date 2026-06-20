'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, UserCog, Loader2, Eye, EyeOff } from 'lucide-react';
import { usersApi } from '@/features/users/users.api';
import { rolesApi } from '@/features/roles/roles.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Can } from '@/components/can';
import type { AdminUser } from '@kamiab/types';
import { ApiError } from '@/lib/api-client';
import { format } from 'date-fns';

const createSchema = z.object({
  name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Min 8 characters'),
  roleId: z.string().min(1, 'Select a role'),
  isActive: z.boolean(),
});

const editSchema = createSchema.extend({
  password: z.string().min(8, 'Min 8 characters').or(z.literal('')).optional(),
});

type CreateForm = z.infer<typeof createSchema>;

function UserFormDialog({
  user,
  open,
  onClose,
}: {
  user?: AdminUser;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!user;
  const [showPw, setShowPw] = useState(false);
  const [changePassword, setChangePassword] = useState(false);

  const { data: roles = [] } = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list });

  const schema = isEdit ? editSchema : createSchema;

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } =
    useForm<CreateForm>({
      resolver: zodResolver(schema),
      defaultValues: {
        name: user?.name ?? '',
        email: user?.email ?? '',
        password: '',
        roleId: typeof user?.role === 'object' ? user.role._id : '',
        isActive: user?.isActive ?? true,
      },
    });

  const isActive = watch('isActive');

  const mutation = useMutation({
    mutationFn: (data: CreateForm) => {
      if (isEdit) {
        const updateData: Parameters<typeof usersApi.update>[1] = {
          name: data.name,
          email: data.email,
          roleId: data.roleId,
          isActive: data.isActive,
        };
        if (changePassword && data.password) updateData.password = data.password;
        return usersApi.update(user!._id, updateData);
      }
      return usersApi.create({ ...data, password: data.password ?? '' });
    },
    onSuccess: () => {
      toast.success(isEdit ? 'User updated' : 'User created');
      qc.invalidateQueries({ queryKey: ['users'] });
      reset();
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save user');
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit User' : 'Create User'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input placeholder="Md. Rahman" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" placeholder="user@example.com" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          {/* Password field */}
          {isEdit ? (
            <div className="space-y-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Switch
                  checked={changePassword}
                  onCheckedChange={setChangePassword}
                />
                Change password
              </label>
              {changePassword && (
                <div className="relative">
                  <Input
                    type={showPw ? 'text' : 'password'}
                    placeholder="New password (min 8 chars)"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    onClick={() => setShowPw((v) => !v)}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  {errors.password && (
                    <p className="text-xs text-destructive">{errors.password.message}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Password</Label>
              <div className="relative">
                <Input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min 8 characters"
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPw((v) => !v)}
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select
              defaultValue={typeof user?.role === 'object' ? user.role._id : ''}
              onValueChange={(v) => setValue('roleId', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r._id} value={r._id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.roleId && <p className="text-xs text-destructive">{errors.roleId.message}</p>}
          </div>

          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <Switch
              checked={isActive}
              onCheckedChange={(v) => setValue('isActive', v)}
            />
            Active account
          </label>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Create user'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | undefined>();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  });

  const users = data?.data ?? [];

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      toast.success('User deleted');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete user');
    },
  });

  const openCreate = () => { setEditingUser(undefined); setDialogOpen(true); };
  const openEdit = (user: AdminUser) => { setEditingUser(user); setDialogOpen(true); };
  const handleDelete = (user: AdminUser) => {
    if (!confirm(`Delete user "${user.name}"?`)) return;
    deleteMutation.mutate(user._id);
  };

  const initials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage admin panel users</p>
        </div>
        <Can permission="users.create">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New User
          </Button>
        </Can>
      </div>

      <div className="rounded-xl border border-border bg-surface">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <UserCog className="mb-3 h-10 w-10 opacity-30" />
            <p>No users yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{initials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {typeof user.role === 'object' ? user.role.name : user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.isActive ? (
                      <Badge variant="confirmed">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {user.lastLogin
                      ? format(new Date(user.lastLogin), 'dd MMM yyyy, HH:mm')
                      : 'Never'}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Can permission="users.edit">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Can>
                      <Can permission="users.delete">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(user)}
                          disabled={deleteMutation.isPending}
                          className="text-destructive hover:text-destructive"
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

      <UserFormDialog
        user={editingUser}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
