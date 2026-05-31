'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { AdminHeader } from '@/components/layout/admin-header';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { useCurrentUser } from '@/hooks/use-current-user';
import { ErrorBoundary } from '@/components/error-boundary';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, isAuthenticated, isError } = useCurrentUser();

  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (!isLoading && isError && !isAuthenticated && !isLoginPage) {
      router.replace('/admin/login');
    }
  }, [isLoading, isError, isAuthenticated, isLoginPage, router]);

  // Login page renders without the admin shell
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <AdminHeader onMenuClick={() => setSidebarOpen(true)} />

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="border-b border-border bg-surface px-6 py-2.5">
            <Breadcrumbs />
          </div>
          <div className="p-6">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
