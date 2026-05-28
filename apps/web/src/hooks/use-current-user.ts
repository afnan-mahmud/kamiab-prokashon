'use client';

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';
import { authApi } from '@/features/auth/auth.api';
import type { AuthResponse } from '@/features/auth/auth.api';

// Shared channel — all tabs on the same origin listen here
const AUTH_CHANNEL = typeof window !== 'undefined' ? new BroadcastChannel('auth-sync') : null;

export function useCurrentUser() {
  const { setAuth, clearAuth, isAuthenticated, user } = useAuthStore();
  const qc = useQueryClient();
  // True if this tab received a valid token from another tab before its own fetch completed
  const seededFromChannel = useRef(false);

  // Listen for auth updates broadcast by sibling tabs
  useEffect(() => {
    if (!AUTH_CHANNEL) return;

    const handler = (event: MessageEvent<{ type: string; data?: AuthResponse }>) => {
      if (event.data?.type === 'auth-update' && event.data.data) {
        const { accessToken, user: u } = event.data.data;
        seededFromChannel.current = true;
        setAuth(u, accessToken);
        // Populate the query cache so this tab's query never fires a network call
        qc.setQueryData(['auth', 'session'], event.data.data);
      } else if (event.data?.type === 'auth-clear') {
        clearAuth();
      }
    };

    AUTH_CHANNEL.addEventListener('message', handler);
    return () => AUTH_CHANNEL.removeEventListener('message', handler);
  }, [setAuth, clearAuth, qc]);

  const query = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: async () => {
      const data = await authApi.refresh();
      // Broadcast the new token to every other open tab
      AUTH_CHANNEL?.postMessage({ type: 'auth-update', data });
      return data;
    },
    retry: false,
    staleTime: 14 * 60 * 1000,
    refetchInterval: 14 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data) {
      setAuth(query.data.user, query.data.accessToken);
    } else if (query.isError) {
      clearAuth();
      AUTH_CHANNEL?.postMessage({ type: 'auth-clear' });
    }
  }, [query.data, query.isError, setAuth, clearAuth]);

  return {
    user: query.data?.user ?? user,
    isLoading: query.isPending && !seededFromChannel.current,
    isAuthenticated: query.isSuccess || isAuthenticated,
    isError: query.isError && !seededFromChannel.current,
  };
}
