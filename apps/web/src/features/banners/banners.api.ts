import { apiClient } from '@/lib/api-client';
import type { Banner, CreateBannerInput, UpdateBannerInput } from '@shukhilife/types';

export const bannersApi = {
  list: () => apiClient.get<Banner[]>('/admin/banners'),
  create: (data: CreateBannerInput) => apiClient.post<Banner>('/admin/banners', data),
  update: (id: string, data: UpdateBannerInput) =>
    apiClient.patch<Banner>(`/admin/banners/${id}`, data),
  remove: (id: string) => apiClient.delete<{ deleted: boolean }>(`/admin/banners/${id}`),
};
