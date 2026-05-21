import { apiClient } from '@/lib/api-client';
import type { AdminUser } from '@cholonbil/types';

export interface AuthResponse {
  accessToken: string;
  user: AdminUser;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<AuthResponse>('/auth/login', { email, password }),

  refresh: () => apiClient.post<AuthResponse>('/auth/refresh', {}),

  logout: () => apiClient.post<{ message: string }>('/auth/logout', {}),

  me: (token: string) =>
    apiClient.get<{ user: AdminUser }>('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    }),
};
