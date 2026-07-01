import { apiClient } from '@/lib/api-client';
import type { Publisher, CreatePublisherInput, UpdatePublisherInput } from '@kamiab/types';

export const publishersApi = {
  list: () => apiClient.get<Publisher[]>('/admin/publishers'),
  create: (data: CreatePublisherInput) => apiClient.post<Publisher>('/admin/publishers', data),
  update: (id: string, data: UpdatePublisherInput) =>
    apiClient.patch<Publisher>(`/admin/publishers/${id}`, data),
  remove: (id: string) => apiClient.delete<{ deleted: boolean }>(`/admin/publishers/${id}`),
};
