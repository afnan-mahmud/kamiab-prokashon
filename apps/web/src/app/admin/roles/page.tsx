'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Shield, Loader2 } from 'lucide-react';
import { rolesApi } from '@/features/roles/roles.api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import type { Role, Permission } from '@cholonbil/types';
import { ApiError } from '@/lib/api-client';

// Permission groups for the checkbox UI
const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  { label: 'Dashboard', permissions: ['dashboard.view'] },
  {
    label: 'Orders',
    permissions: ['orders.view', 'orders.create', 'orders.edit', 'orders.delete', 'orders.send_to_courier', 'orders.fraud_check'],
  },
  { label: 'Customers', permissions: ['customers.view', 'customers.edit', 'customers.delete'] },
  {
    label: 'Accounts',
    permissions: ['accounts.view', 'accounts.income.view', 'accounts.expense.view', 'accounts.expense.create'],
  },
  { label: 'Products', permissions: ['products.view', 'products.create', 'products.edit', 'products.delete'] },
  { label: 'Landing Pages', permissions: ['landing.view', 'landing.create', 'landing.edit', 'landing.delete'] },
  { label: 'Delivery', permissions: ['delivery.view', 'delivery.edit'] },
  { label: 'Roles', permissions: ['roles.view', 'roles.create', 'roles.edit', 'roles.delete'] },
  { label: 'Users', permissions: ['users.view', 'users.create', 'users.edit', 'users.delete'] },
  { label: 'Settings', permissions: ['settings.view', 'settings.edit'] },
];

const PERMISSION_LABELS: Record<string, string> = {
  'dashboard.view': 'View',
  'orders.view': 'View', 'orders.create': 'Create', 'orders.edit': 'Edit',
  'orders.delete': 'Delete', 'orders.send_to_courier': 'Send to Courier', 'orders.fraud_check': 'Fraud Check',
  'customers.view': 'View', 'customers.edit': 'Edit', 'customers.delete': 'Delete',
  'accounts.view': 'View', 'accounts.income.view': 'Income', 'accounts.expense.view': 'Expense',
  'accounts.expense.create': 'Add Expense',
  'products.view': 'View', 'products.create': 'Create', 'products.edit': 'Edit',
  'products.delete': 'Delete',
  'landing.view': 'View', 'landing.create': 'Create', 'landing.edit': 'Edit',
  'landing.delete': 'Delete',
  'delivery.view': 'View', 'delivery.edit': 'Edit',
  'roles.view': 'View', 'roles.create': 'Create', 'roles.edit': 'Edit', 'roles.delete': 'Delete',
  'users.view': 'View', 'users.create': 'Create', 'users.edit': 'Edit', 'users.delete': 'Delete',
  'settings.view': 'View', 'settings.edit': 'Edit',
};

const roleFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  permissions: z.array(z.string()).min(1, 'Select at least one permission'),
});
type RoleFormValues = z.infer<typeof roleFormSchema>;

function RoleFormDialog({
  role,
  open,
  onClose,
}: {
  role?: Role;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!role;

  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: role?.name ?? '',
      permissions: role?.permissions ?? [],
    },
  });

  const mutation = useMutation({
    mutationFn: (data: RoleFormValues) =>
      isEdit
        ? rolesApi.update(role!._id, { name: data.name, permissions: data.permissions as Permission[] })
        : rolesApi.create({ name: data.name, permissions: data.permissions as Permission[] }),
    onSuccess: () => {
      toast.success(isEdit ? 'Role updated' : 'Role created');
      qc.invalidateQueries({ queryKey: ['roles'] });
      reset();
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to save role');
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Role' : 'Create Role'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
          <div className="space-y-1.5">
            <Label>Role name</Label>
            <Input placeholder="e.g. Manager" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-3">
            <Label>Permissions</Label>
            {errors.permissions && (
              <p className="text-xs text-destructive">{errors.permissions.message}</p>
            )}
            <Controller
              control={control}
              name="permissions"
              render={({ field }) => (
                <div className="space-y-4">
                  {PERMISSION_GROUPS.map((group) => (
                    <div key={group.label}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {group.label}
                      </p>
                      <div className="flex flex-wrap gap-x-6 gap-y-2">
                        {group.permissions.map((perm) => {
                          const checked = field.value.includes(perm);
                          return (
                            <label
                              key={perm}
                              className="flex cursor-pointer items-center gap-2 text-sm"
                            >
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => {
                                  field.onChange(
                                    v
                                      ? [...field.value, perm]
                                      : field.value.filter((p) => p !== perm),
                                  );
                                }}
                              />
                              {PERMISSION_LABELS[perm] ?? perm}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Save changes' : 'Create role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function RolesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | undefined>();
  const qc = useQueryClient();

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: rolesApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: rolesApi.delete,
    onSuccess: () => {
      toast.success('Role deleted');
      qc.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete role');
    },
  });

  const openCreate = () => { setEditingRole(undefined); setDialogOpen(true); };
  const openEdit = (role: Role) => { setEditingRole(role); setDialogOpen(true); };
  const handleDelete = (role: Role) => {
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    deleteMutation.mutate(role._id);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Roles</h1>
          <p className="text-muted-foreground">Manage admin roles and permissions</p>
        </div>
        <Can permission="roles.create">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            New Role
          </Button>
        </Can>
      </div>

      <div className="rounded-xl border border-border bg-surface">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : roles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Shield className="mb-3 h-10 w-10 opacity-30" />
            <p>No roles yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role._id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {role.permissions.length} permissions
                    </span>
                  </TableCell>
                  <TableCell>
                    {role.isSystem ? (
                      <Badge variant="confirmed">System</Badge>
                    ) : (
                      <Badge variant="secondary">Custom</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Can permission="roles.edit">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={role.isSystem}
                          onClick={() => openEdit(role)}
                          title={role.isSystem ? 'System roles cannot be edited' : 'Edit'}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Can>
                      <Can permission="roles.delete">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={role.isSystem || deleteMutation.isPending}
                          onClick={() => handleDelete(role)}
                          className="text-destructive hover:text-destructive"
                          title={role.isSystem ? 'System roles cannot be deleted' : 'Delete'}
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

      <RoleFormDialog
        role={editingRole}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </div>
  );
}
