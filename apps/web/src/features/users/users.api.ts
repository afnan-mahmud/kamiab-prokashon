import { apiClient } from '@/lib/api-client';
import type { AdminUser, Role } from '@kamiab/types';
import type { PaginatedResponse } from '@kamiab/types';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  roleId: string;
  isActive: boolean;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  roleId?: string;
  isActive?: boolean;
}

export const usersApi = {
  list: (page = 1) =>
    apiClient.get<PaginatedResponse<AdminUser>>('/admin/users', { params: { page, limit: 20 } }),
  create: (data: CreateUserInput) => apiClient.post<AdminUser>('/admin/users', data),
  update: (id: string, data: UpdateUserInput) =>
    apiClient.patch<AdminUser>(`/admin/users/${id}`, data),
  delete: (id: string) => apiClient.delete<{ deleted: boolean }>(`/admin/users/${id}`),
  roles: () => apiClient.get<Role[]>('/admin/roles'),
};
