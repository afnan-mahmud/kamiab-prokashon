'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { authApi } from '@/features/auth/auth.api';

export function useCurrentUser() {
  const { setAuth, clearAuth, isAuthenticated, user } = useAuthStore();

  const query = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      // Always try refresh first — access token may be expired/missing
      const data = await authApi.refresh();
      return data;
    },
    retry: false,
    staleTime: 14 * 60 * 1000, // refresh 1 min before 15-min token expires
    refetchInterval: 14 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data) {
      setAuth(query.data.user, query.data.accessToken);
    } else if (query.isError) {
      clearAuth();
    }
  }, [query.data, query.isError, setAuth, clearAuth]);

  return {
    user: query.data?.user ?? user,
    isLoading: query.isPending,
    isAuthenticated: query.isSuccess || isAuthenticated,
    isError: query.isError,
  };
}
