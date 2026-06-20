import { apiClient } from '@/lib/api-client';
import type { Customer, Order, PaginatedResponse } from '@kamiab/types';

export interface CustomerFilters extends Record<string, string | number | undefined> {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
}

export interface UpdateCustomerInput {
  name?: string;
  email?: string;
  notes?: string;
}

export const customersApi = {
  list: (filters: CustomerFilters = {}) =>
    apiClient.get<PaginatedResponse<Customer>>('/admin/customers', { params: filters }),

  get: (id: string) => apiClient.get<Customer>(`/admin/customers/${id}`),

  update: (id: string, data: UpdateCustomerInput) =>
    apiClient.patch<Customer>(`/admin/customers/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<{ deleted: boolean }>(`/admin/customers/${id}`),

  orders: (id: string, page = 1, limit = 10) =>
    apiClient.get<PaginatedResponse<Order>>(`/admin/customers/${id}/orders`, {
      params: { page, limit },
    }),
};
