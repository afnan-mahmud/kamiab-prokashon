import { apiClient } from '@/lib/api-client';
import type {
  StockMovement,
  StockSummary,
  AddStockInput,
  AdjustStockInput,
  PaginatedResponse,
} from '@sodaikini/types';

export interface StockMovementFilters
  extends Record<string, string | number | boolean | undefined> {
  productId?: string;
  type?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export const stockApi = {
  summary: () => apiClient.get<StockSummary>('/admin/stock/summary'),

  movements: (filters: StockMovementFilters = {}) =>
    apiClient.get<PaginatedResponse<StockMovement>>('/admin/stock/movements', {
      params: filters,
    }),

  addStock: (data: AddStockInput) =>
    apiClient.post<StockMovement>('/admin/stock/movements', data),

  adjust: (data: AdjustStockInput) =>
    apiClient.post<StockMovement>('/admin/stock/adjust', data),
};
