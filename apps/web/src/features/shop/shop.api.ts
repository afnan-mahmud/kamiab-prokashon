import { apiClient } from '@/lib/api-client';
import type { Product, PaginatedResponse } from '@cholonbil/types';

export interface PublicProductFilters extends Record<string, string | number | boolean | undefined> {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  sort?: string;
}

export interface CustomerLookup {
  name: string;
  address: string;
  city: string;
  area: string;
}

export interface DeliveryCharges {
  insideDhaka: number;
  outsideDhaka: number;
  extraPerKg: number;
  baseWeightKg: number;
}

export interface CheckoutInput {
  customerPhone: string;
  customerName: string;
  address: string;
  city: string;
  area: string;
  deliveryLocation: 'inside_dhaka' | 'outside_dhaka';
  paymentMethod: 'cash' | 'bkash' | 'card';
  notes?: string;
  source?: 'website' | 'landing_page';
  items: { productId: string; variantId: string; quantity: number }[];
}

export interface OrderConfirmation {
  orderNumber: string;
  orderId: string;
  total: number;
}

export const shopApi = {
  products: (filters: PublicProductFilters = {}) =>
    apiClient.get<PaginatedResponse<Product>>('/products', { params: filters }),

  product: (slug: string) => apiClient.get<Product>(`/products/${slug}`),

  suggested: (exclude?: string, limit = 5) =>
    apiClient.get<Product[]>('/products/suggested', {
      params: { exclude, limit },
    }),

  categories: () => apiClient.get<string[]>('/products/categories'),

  lookup: (phone: string) =>
    apiClient.get<CustomerLookup>('/customers/lookup', { params: { phone } }),

  deliveryCharges: () => apiClient.get<DeliveryCharges>('/delivery/charges'),

  createOrder: (data: CheckoutInput) =>
    apiClient.post<OrderConfirmation>('/orders', data),
};
