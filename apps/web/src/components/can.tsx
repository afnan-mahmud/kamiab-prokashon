'use client';

import type { Permission } from '@sodaikini/types';
import { useAuthStore } from '@/stores/auth.store';

interface CanProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function Can({ permission, children, fallback = null }: CanProps) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <>{fallback}</>;
  if (!user.role.permissions.includes(permission)) return <>{fallback}</>;
  return <>{children}</>;
}

// Imperative check — use in callbacks/logic
export function usePermission(permission: Permission): boolean {
  const user = useAuthStore((s) => s.user);
  if (!user) return false;
  return user.role.permissions.includes(permission);
}
