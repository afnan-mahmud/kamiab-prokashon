'use client';

import { useEffect, useState } from 'react';

interface Props {
  ctaText: string;
  accentColor: string;
}

export function StickyOrderButton({ ctaText, accentColor }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const target = document.getElementById('order');
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => setVisible(!entries[0]?.isIntersecting),
      { threshold: 0.1 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 md:hidden p-3">
      <a
        href="#order"
        className="flex items-center justify-center gap-2 w-full rounded-2xl py-4 text-base font-bold text-white shadow-2xl"
        style={{ backgroundColor: accentColor }}
      >
        {ctaText}
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
          />
        </svg>
      </a>
    </div>
  );
}
