import { apiClient } from '@/lib/api-client';
import type { Product, ProductImage, PreviewPdf, PaginatedResponse } from '@kamiab/types';

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
  regularPrice?: number;
  sku: string;
  weight: number;
  isDefault: boolean;
  customDelivery?: { insideDhaka: number; outsideDhaka: number };
}

export interface ProductInput {
  name: string;
  slug: string;
  description: string;
  category: string;
  images: ProductImage[];
  // Book fields
  author?: string;
  publisher?: string;
  translator?: string;
  language?: string;
  binding?: string;
  edition?: string;
  isbn?: string;
  pages?: number;
  publicationYear?: number;
  // Preview
  previewImages?: ProductImage[];
  previewPdf?: PreviewPdf | null;
  variants: VariantInput[];
  poolStock?: number;
  reorderPoint?: number;
  customDeliveryEnabled?: boolean;
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
