import { apiClient } from '@/lib/api-client';
import type { Product, ProductImage, PaginatedResponse } from '@cholonbil/types';

export interface ProductFilters extends Record<string, string | number | boolean | undefined> {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  isActive?: boolean;
  sort?: string;
}

export interface VariantInput {
  _id?: string;
  label: string;
  price: number;
  stock: number;
  sku: string;
  weight: number;
  isDefault: boolean;
}

export interface ProductInput {
  name: string;
  slug: string;
  description: string;
  category: string;
  images: ProductImage[];
  variants: VariantInput[];
  isActive: boolean;
}

export const productsApi = {
  list: (filters: ProductFilters = {}) =>
    apiClient.get<PaginatedResponse<Product>>('/admin/products', { params: filters }),

  get: (id: string) => apiClient.get<Product>(`/admin/products/${id}`),

  create: (data: ProductInput) => apiClient.post<Product>('/admin/products', data),

  update: (id: string, data: Partial<ProductInput>) =>
    apiClient.patch<Product>(`/admin/products/${id}`, data),

  delete: (id: string) => apiClient.delete<{ deleted: boolean }>(`/admin/products/${id}`),

  categories: () => apiClient.get<string[]>('/admin/products/meta/categories'),
};
