import { apiClient } from '@/lib/api-client';
import type { Order, PaginatedResponse, ProcessReturnInput } from '@cholonbil/types';

export interface OrderFilters extends Record<string, string | number | boolean | undefined> {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  source?: string;
  from?: string;
  to?: string;
  sort?: string;
}

export interface ManualOrderItem {
  productId: string;
  variantId: string;
  quantity: number;
}

export interface ManualOrderInput {
  customerPhone: string;
  customerName: string;
  address: string;
  city: string;
  area: string;
  deliveryLocation: 'inside_dhaka' | 'outside_dhaka';
  paymentMethod: 'cash' | 'bkash' | 'card' | 'steadfast';
  discount?: number;
  notes?: string;
  items: ManualOrderItem[];
}

export interface UpdateOrderInput {
  status?: string;
  statusNote?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  discount?: number;
  notes?: string;
  customerSnapshot?: {
    name?: string;
    phone?: string;
    address?: string;
    city?: string;
    area?: string;
  };
  deliveryLocation?: 'inside_dhaka' | 'outside_dhaka';
  items?: ManualOrderItem[];
}

export const ordersApi = {
  list: (filters: OrderFilters = {}) =>
    apiClient.get<PaginatedResponse<Order>>('/admin/orders', { params: filters }),

  get: (id: string) => apiClient.get<Order>(`/admin/orders/${id}`),

  create: (data: ManualOrderInput) => apiClient.post<Order>('/admin/orders', data),

  update: (id: string, data: UpdateOrderInput) =>
    apiClient.patch<Order>(`/admin/orders/${id}`, data),

  sendToCourier: (id: string) =>
    apiClient.post<Order>(`/admin/orders/${id}/courier`, {}),

  syncCourier: (id: string) =>
    apiClient.post<{ courierStatus: string }>(`/admin/orders/${id}/courier/sync`, {}),

  processReturn: (id: string, data: ProcessReturnInput) =>
    apiClient.post<Order>(`/admin/orders/${id}/return`, data),
};
