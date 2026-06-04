import { apiClient } from '@/lib/api-client';
import type { Transaction, CreateExpenseInput, PaginatedResponse } from '@shukhilife/types';

export interface AccountsSummary {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  cashInHand: number;
  incomeByMethod: { method: string; total: number }[];
  expenseByCategory: { category: string; total: number }[];
}

export interface MonthlyPoint {
  month: string;
  income: number;
  expense: number;
}

export interface TransactionFilters extends Record<string, string | number | undefined> {
  page?: number;
  limit?: number;
  type?: string;
  category?: string;
  paymentMethod?: string;
  from?: string;
  to?: string;
}

export const accountsApi = {
  summary: (from?: string, to?: string) =>
    apiClient.get<AccountsSummary>('/admin/accounts/summary', {
      params: { from, to },
    }),

  monthly: (year?: number) =>
    apiClient.get<MonthlyPoint[]>('/admin/accounts/monthly', {
      params: year ? { year } : undefined,
    }),

  transactions: (filters: TransactionFilters = {}) =>
    apiClient.get<PaginatedResponse<Transaction>>('/admin/transactions', { params: filters }),

  createExpense: (data: CreateExpenseInput) =>
    apiClient.post<Transaction>('/admin/transactions', data),

  updateExpense: (id: string, data: Partial<CreateExpenseInput>) =>
    apiClient.patch<Transaction>(`/admin/transactions/${id}`, data),

  deleteExpense: (id: string) =>
    apiClient.delete<{ deleted: boolean }>(`/admin/transactions/${id}`),

  exportCsv: (filters: { type?: string; from?: string; to?: string } = {}) => {
    const params = new URLSearchParams();
    if (filters.type) params.set('type', filters.type);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    return `${apiUrl}/api/admin/transactions/export?${params.toString()}`;
  },
};
