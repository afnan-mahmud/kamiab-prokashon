import { apiClient } from '@/lib/api-client';

export interface AbandonedOrder {
  _id: string;
  phone: string;
  name?: string;
  address?: string;
  source: 'landing_page' | 'checkout';
  landingPageSlug?: string;
  status: 'active' | 'fake';
  createdAt: string;
  updatedAt: string;
}

export interface AbandonedOrdersResponse {
  items: AbandonedOrder[];
  total: number;
  page: number;
  pages: number;
}

export interface UpsertAbandonedInput {
  phone: string;
  name?: string;
  address?: string;
  source: 'landing_page' | 'checkout';
  landingPageSlug?: string;
}

export const abandonedOrdersApi = {
  // Public — called from forms
  upsert: (data: UpsertAbandonedInput) =>
    apiClient.post<{ ok: boolean }>('/abandoned', data),

  remove: (phone: string) =>
    apiClient.delete<{ ok: boolean }>(`/abandoned?phone=${encodeURIComponent(phone)}`),

  // Admin
  list: (page = 1, status?: string) =>
    apiClient.get<AbandonedOrdersResponse>('/admin/abandoned-orders', {
      params: { page, ...(status ? { status } : {}) },
    }),

  markFake: (id: string) =>
    apiClient.patch<AbandonedOrder>(`/admin/abandoned-orders/${id}/fake`, {}),

  delete: (id: string) =>
    apiClient.delete<{ ok: boolean }>(`/admin/abandoned-orders/${id}`),
};
