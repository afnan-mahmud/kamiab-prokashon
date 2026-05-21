'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

const LABELS: Record<string, string> = {
  admin: 'Admin',
  orders: 'Orders',
  customers: 'Customers',
  accounts: 'Accounts',
  products: 'Products',
  'landing-pages': 'Landing Pages',
  delivery: 'Delivery',
  roles: 'Roles',
  users: 'Users',
  settings: 'Settings',
  new: 'New Product',
  edit: 'Edit',
};

export function Breadcrumbs() {
  const pathname = usePathname();

  // /admin/products/new → ['admin', 'products', 'new']
  const segments = pathname.split('/').filter(Boolean);

  // Build crumb list, resolving dynamic [id] segments as "Edit"
  const crumbs: { label: string; href: string }[] = [];
  let path = '';
  for (const segment of segments) {
    path += `/${segment}`;
    // Dynamic MongoDB ObjectId segments
    const isId = /^[a-f0-9]{24}$/i.test(segment);
    const label = isId ? 'Edit' : (LABELS[segment] ?? segment);
    crumbs.push({ label, href: path });
  }

  if (crumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1 text-sm text-muted-foreground"
    >
      <Link href="/admin" className="hover:text-foreground">
        <Home className="h-3.5 w-3.5" />
      </Link>
      {crumbs.slice(1).map((crumb, i) => {
        const isLast = i === crumbs.length - 2;
        return (
          <span key={crumb.href} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5" />
            {isLast ? (
              <span className="font-medium text-foreground">{crumb.label}</span>
            ) : (
              <Link href={crumb.href} className="hover:text-foreground">
                {crumb.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
