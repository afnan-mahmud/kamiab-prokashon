'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Banner } from '@kamiab/types';

interface HeroCarouselProps {
  banners: Banner[];
}

export function HeroCarousel({ banners }: HeroCarouselProps) {
  const [index, setIndex] = useState(0);

  const advance = useCallback(() => {
    setIndex((i) => (i + 1) % banners.length);
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const id = setInterval(advance, 5000);
    return () => clearInterval(id);
  }, [advance, banners.length]);

  if (banners.length === 0) return null;

  const banner = banners[index];
  if (!banner) return null;

  const link = banner.link;
  const Wrapper = link
    ? ({ children }: { children: React.ReactNode }) => (
        <Link href={link} className="block h-full w-full">
          {children}
        </Link>
      )
    : ({ children }: { children: React.ReactNode }) => (
        <div className="block h-full w-full">{children}</div>
      );

  return (
    <div className="relative overflow-hidden bg-muted">
      {/* Slide */}
      <div className="relative">
        <Wrapper>
          {/* Desktop image */}
          <div className="relative hidden aspect-[16/6] w-full md:block">
            <Image
              src={banner.desktopImage.url}
              alt={banner.title ?? ''}
              fill
              sizes="100vw"
              className="object-cover"
              priority={index === 0}
            />
          </div>
          {/* Mobile image */}
          <div className="relative block aspect-[4/3] w-full md:hidden">
            <Image
              src={banner.mobileImage.url}
              alt={banner.title ?? ''}
              fill
              sizes="100vw"
              className="object-cover"
              priority={index === 0}
            />
          </div>
        </Wrapper>
      </div>

      {/* Arrow buttons */}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => setIndex((i) => (i - 1 + banners.length) % banners.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50"
            aria-label="আগের স্লাইড"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={advance}
            className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition hover:bg-black/50"
            aria-label="পরের স্লাইড"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {banners.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`স্লাইড ${i + 1}`}
              className={cn(
                'h-2 rounded-full transition-all',
                i === index ? 'w-5 bg-white' : 'w-2 bg-white/50',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
