'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { ShoppingCart, Menu, X, Search, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCartStore } from '@/stores/cart.store';
import { shopApi } from '@/features/shop/shop.api';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { BRAND } from '@/lib/brand';
import type { CategoryNode } from '@kamiab/types';

const NAV_LINKS = [
  { href: '/', label: 'হোম' },
  { href: '/shop', label: 'শপ' },
  { href: '/contact', label: 'যোগাযোগ' },
];

function DesktopCategoryMenu({ categories }: { categories: CategoryNode[] }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  if (categories.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      {categories.map((cat) => {
        const hasChildren = cat.children.length > 0;
        const isOpen = openSlug === cat.slug;

        return (
          <div
            key={cat._id}
            className="relative"
            onMouseEnter={() => hasChildren && setOpenSlug(cat.slug)}
            onMouseLeave={() => setOpenSlug(null)}
          >
            <Link
              href={`/shop?category=${cat.slug}`}
              onClick={() => setOpenSlug(null)}
              className="flex items-center gap-0.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {cat.name}
              {hasChildren && <ChevronDown className="h-3.5 w-3.5" />}
            </Link>

            {hasChildren && isOpen && (
              <div className="absolute left-0 top-full z-50 min-w-[180px] rounded-md border border-border bg-white py-1 shadow-lg">
                {cat.children.map((child) => (
                  <Link
                    key={child._id}
                    href={`/shop?category=${child.slug}`}
                    onClick={() => setOpenSlug(null)}
                    className="block px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {child.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MobileCategoryAccordion({
  categories,
  onNavigate,
}: {
  categories: CategoryNode[];
  onNavigate: () => void;
}) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  if (categories.length === 0) return null;

  return (
    <div className="border-t border-border py-2">
      <p className="px-4 py-1 text-xs font-semibold uppercase text-muted-foreground">বিভাগ</p>
      {categories.map((cat) => {
        const hasChildren = cat.children.length > 0;
        const isOpen = openSlug === cat.slug;

        return (
          <div key={cat._id}>
            {hasChildren ? (
              <>
                <button
                  onClick={() => setOpenSlug(isOpen ? null : cat.slug)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-foreground"
                >
                  {cat.name}
                  <ChevronDown
                    className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
                  />
                </button>
                {isOpen && (
                  <div className="bg-muted/30 pl-6">
                    {cat.children.map((child) => (
                      <Link
                        key={child._id}
                        href={`/shop?category=${child.slug}`}
                        onClick={onNavigate}
                        className="block py-2 text-sm text-muted-foreground"
                      >
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link
                href={`/shop?category=${cat.slug}`}
                onClick={onNavigate}
                className="block px-4 py-2.5 text-sm font-medium text-foreground"
              >
                {cat.name}
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const pathname = usePathname();
  const router = useRouter();
  const itemCount = useCartStore((s) => s.itemCount());
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['public-category-tree'],
    queryFn: () => shopApi.categoryTree(),
    staleTime: 5 * 60_000,
  });

  const handleSearch = () => {
    const q = searchInput.trim();
    if (!q) return;
    router.push('/shop?search=' + encodeURIComponent(q));
  };

  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/95 shadow-header backdrop-blur-sm">
      {/* Top row: logo + search + cart + hamburger */}
      <div className="container-page flex h-16 items-center gap-3">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center">
          <Image src="/logo.png" alt={BRAND.nameEn} width={140} height={44} className="object-contain" priority />
        </Link>

        {/* Search bar (centered, flex-1) */}
        <div className="relative flex flex-1 items-center">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchRef}
            placeholder="বই খুঁজুন..."
            className="h-9 flex-1 rounded-r-none border-r-0 pl-9 focus-visible:ring-0 focus-visible:ring-offset-0"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            aria-label="বই খুঁজুন"
          />
          <button
            onClick={handleSearch}
            className="h-9 shrink-0 rounded-r-md border border-l-0 border-input bg-primary px-4 text-sm font-medium text-white transition hover:bg-primary/90"
            aria-label="খুঁজুন"
          >
            খুঁজুন
          </button>
        </div>

        {/* Cart */}
        <Link
          href="/cart"
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-muted"
          aria-label="কার্ট"
        >
          <ShoppingCart className="h-5 w-5" />
          {itemCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
              {itemCount > 99 ? '৯৯+' : itemCount}
            </span>
          )}
        </Link>

        {/* Mobile hamburger */}
        <button
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-muted md:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="মেনু"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Desktop second row: categories + nav links */}
      <div className="hidden border-t border-border/60 bg-white md:block">
        <div className="container-page flex h-10 items-center gap-4">
          <DesktopCategoryMenu categories={categories} />
          <div className="ml-auto flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground',
                  pathname === link.href ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="border-t border-border bg-white md:hidden">
          <nav className="container-page flex flex-col py-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className={cn(
                  'py-2.5 text-sm font-medium transition-colors',
                  pathname === link.href ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <MobileCategoryAccordion categories={categories} onNavigate={closeMenu} />
        </div>
      )}
    </header>
  );
}
