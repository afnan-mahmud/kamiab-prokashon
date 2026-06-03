import { apiClient } from '@/lib/api-client';
import type { LandingPage, PaginatedResponse } from '@sodaikini/types';

export interface CreateLandingPageInput {
  name: string;
  slug: string;
  template: 'template1' | 'template2' | 'template3' | 'template4';
  product: string;
  selectedVariants: string[];
  content?: Partial<LandingPage['content']>;
  isActive?: boolean;
}

export const landingPagesApi = {
  list: (page = 1) =>
    apiClient.get<PaginatedResponse<LandingPage>>('/admin/landing-pages', {
      params: { page, limit: 20 },
    }),

  get: (id: string) => apiClient.get<LandingPage>(`/admin/landing-pages/${id}`),

  create: (data: CreateLandingPageInput) =>
    apiClient.post<LandingPage>('/admin/landing-pages', data),

  update: (id: string, data: Partial<CreateLandingPageInput>) =>
    apiClient.patch<LandingPage>(`/admin/landing-pages/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<{ deleted: boolean }>(`/admin/landing-pages/${id}`),

  // Public
  getPublic: (slug: string) => apiClient.get<LandingPage>(`/landing/${slug}`),

  createOrder: (
    slug: string,
    data: {
      phone: string;
      name: string;
      address: string;
      city: string;
      area: string;
      deliveryLocation: 'inside_dhaka' | 'outside_dhaka';
      variantId: string;
      quantity: number;
      paymentMethod?: string;
      notes?: string;
    },
  ) => apiClient.post<{ orderNumber: string; orderId: string }>(`/landing/${slug}/order`, data),
};
