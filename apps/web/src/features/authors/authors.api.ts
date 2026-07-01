import { apiClient } from '@/lib/api-client';
import type { Author, CreateAuthorInput, UpdateAuthorInput } from '@kamiab/types';

export const authorsApi = {
  list: () => apiClient.get<Author[]>('/admin/authors'),
  create: (data: CreateAuthorInput) => apiClient.post<Author>('/admin/authors', data),
  update: (id: string, data: UpdateAuthorInput) =>
    apiClient.patch<Author>(`/admin/authors/${id}`, data),
  remove: (id: string) => apiClient.delete<{ deleted: boolean }>(`/admin/authors/${id}`),
};
