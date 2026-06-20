import { apiClient } from '@/lib/api-client';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '@kamiab/types';

export const categoriesApi = {
  list: () => apiClient.get<Category[]>('/admin/categories'),
  create: (data: CreateCategoryInput) => apiClient.post<Category>('/admin/categories', data),
  update: (id: string, data: UpdateCategoryInput) =>
    apiClient.patch<Category>(`/admin/categories/${id}`, data),
  remove: (id: string) => apiClient.delete<{ deleted: boolean }>(`/admin/categories/${id}`),
};
