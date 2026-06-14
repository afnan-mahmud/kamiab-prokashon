'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Menu, X } from 'lucide-react';
import { useCartStore } from '@/stores/cart.store';
import { cn } from '@/lib/utils';
import { BRAND } from '@/lib/brand';

const NAV_LINKS = [
  { href: '/', label: 'হোম' },
  { href: '/shop', label: 'পণ্যসমূহ' },
  { href: '/contact', label: 'যোগাযোগ' },
];

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const itemCount = useCartStore((s) => s.itemCount());

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 shadow-header backdrop-blur-sm">
      <div className="container-page flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image src="/logo.png" alt={BRAND.nameEn} width={140} height={44} className="object-contain" priority />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-sm font-medium transition-colors hover:text-primary',
                pathname === link.href ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"
            aria-label="কার্ট"
          >
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                {itemCount > 99 ? '৯৯+' : itemCount}
              </span>
            )}
          </Link>

          {/* Mobile menu toggle */}
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="মেনু"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {menuOpen && (
        <div className="border-t border-border bg-white md:hidden">
          <nav className="container-page flex flex-col py-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'py-3 text-sm font-medium transition-colors',
                  pathname === link.href ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
