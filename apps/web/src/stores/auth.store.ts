import { create } from 'zustand';
import type { AdminUser } from '@shukhilife/types';

interface AuthState {
  user: AdminUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AdminUser, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,

  setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),

  clearAuth: () => set({ user: null, accessToken: null, isAuthenticated: false }),
}));
