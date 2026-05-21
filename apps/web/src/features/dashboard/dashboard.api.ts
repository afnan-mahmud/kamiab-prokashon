import { apiClient } from '@/lib/api-client';
import type { DashboardData } from '@cholonbil/types';

export const dashboardApi = {
  get: (from?: string, to?: string) =>
    apiClient.get<DashboardData>('/admin/dashboard', {
      params: { from, to },
    }),
};
