'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Wallet,
  Package,
  BarChart3,
  FileText,
  Truck,
  Shield,
  UserCog,
  MessageSquare,
  ShoppingCart,
  FolderTree,
  PenLine,
  Building2,
  Images,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Can } from '@/components/can';
import type { Permission } from '@kamiab/types';
import { BRAND } from '@/lib/brand';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permission: Permission;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, permission: 'dashboard.view' },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingBag, permission: 'orders.view' },
  { label: 'Abandoned Orders', href: '/admin/abandoned-orders', icon: ShoppingCart, permission: 'orders.view' },
  { label: 'Customers', href: '/admin/customers', icon: Users, permission: 'customers.view' },
  { label: 'Accounts', href: '/admin/accounts', icon: Wallet, permission: 'accounts.view' },
  { label: 'Products', href: '/admin/products', icon: Package, permission: 'products.view' },
  { label: 'Categories', href: '/admin/categories', icon: FolderTree, permission: 'categories.view' },
  { label: 'Authors', href: '/admin/authors', icon: PenLine, permission: 'authors.view' },
  { label: 'Publishers', href: '/admin/publishers', icon: Building2, permission: 'publishers.view' },
  { label: 'Banners', href: '/admin/banners', icon: Images, permission: 'banners.view' },
  { label: 'Stock', href: '/admin/stock', icon: BarChart3, permission: 'stock.view' },
  { label: 'Landing Pages', href: '/admin/landing-pages', icon: FileText, permission: 'landing.view' },
  { label: 'Delivery', href: '/admin/delivery', icon: Truck, permission: 'delivery.view' },
  { label: 'SMS', href: '/admin/settings', icon: MessageSquare, permission: 'settings.view' },
  { label: 'Roles', href: '/admin/roles', icon: Shield, permission: 'roles.view' },
  { label: 'Users', href: '/admin/users', icon: UserCog, permission: 'users.view' },
];

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

export function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-white">KP</span>
            </div>
            <span className="text-sm font-semibold text-sidebar-foreground">{BRAND.nameEn}</span>
          </Link>
          <button
            onClick={onClose}
            className="rounded p-1 text-sidebar-foreground/60 hover:text-sidebar-foreground lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <Can key={item.href} permission={item.permission}>
                <li>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                      isActive(item.href)
                        ? 'border-l-2 border-primary bg-sidebar-accent pl-[10px] font-semibold text-sidebar-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              </Can>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border px-5 py-3">
          <p className="text-xs text-sidebar-foreground/40">{BRAND.nameEn} Admin</p>
        </div>
      </aside>
    </>
  );
}
