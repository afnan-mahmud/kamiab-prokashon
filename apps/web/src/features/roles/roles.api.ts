import { apiClient } from '@/lib/api-client';
import type { Role, Permission } from '@shukhilife/types';

export interface CreateRoleInput {
  name: string;
  permissions: Permission[];
}

export const rolesApi = {
  list: () => apiClient.get<Role[]>('/admin/roles'),
  create: (data: CreateRoleInput) => apiClient.post<Role>('/admin/roles', data),
  update: (id: string, data: CreateRoleInput) =>
    apiClient.patch<Role>(`/admin/roles/${id}`, data),
  delete: (id: string) => apiClient.delete<{ deleted: boolean }>(`/admin/roles/${id}`),
};
