'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { fixImageUrl } from '@/lib/image-url';
import type { ProductImage } from '@kamiab/types';

interface Props {
  images: ProductImage[];
  primary: string;
  /** section heading — falls back to the default when not provided */
  title?: string;
  /** auto-slide interval in ms */
  interval?: number;
}

// গ্রাহকদের মন্তব্য — auto-sliding screenshot carousel for the public landing page
export function ReviewsCarousel({ images, primary, title, interval = 3060 }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const count = images.length;

  // Keep index in range if images change
  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  // Auto-advance
  useEffect(() => {
    if (count <= 1 || paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => clearInterval(id);
  }, [count, paused, interval]);

  if (count === 0) return null;

  const go = (next: number) => setIndex(((next % count) + count) % count);

  return (
    <div>
      <h2 className="mb-6 text-center text-2xl font-extrabold sm:text-3xl" style={{ color: primary }}>
        {title?.trim() ? title : 'গ্রাহকদের মন্তব্য'}
      </h2>

      <div
        className="relative mx-auto max-w-md"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Slides track */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-gray-100">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {images.map((img, i) => (
              <div key={img.publicId || i} className="w-full shrink-0">
                <img
                  src={fixImageUrl(img.url)}
                  alt={img.alt || `গ্রাহকের মন্তব্য ${i + 1}`}
                  className="mx-auto max-h-[480px] w-full object-contain"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Arrows (only when more than one) */}
        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="আগের"
              onClick={() => go(index - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-md transition hover:bg-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="পরের"
              onClick={() => go(index + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-md transition hover:bg-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {/* Dots */}
      {count > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {images.map((img, i) => (
            <button
              key={img.publicId || i}
              type="button"
              aria-label={`স্লাইড ${i + 1}`}
              onClick={() => go(i)}
              className="h-2 rounded-full transition-all"
              style={{
                width: i === index ? 20 : 8,
                backgroundColor: i === index ? primary : '#d1d5db',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
