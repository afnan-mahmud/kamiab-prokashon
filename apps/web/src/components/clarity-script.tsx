'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Clarity from '@microsoft/clarity';

// Clarity project id is managed via env — set NEXT_PUBLIC_CLARITY_ID in .env.local / production env
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

// Module-level guard so Clarity.init runs only once per SPA session
let initialized = false;

export function ClarityScript() {
  const pathname = usePathname();

  useEffect(() => {
    if (initialized || !CLARITY_ID) return;
    // Don't track the admin panel
    if (pathname.startsWith('/admin')) return;
    Clarity.init(CLARITY_ID);
    initialized = true;
  }, [pathname]);

  return null;
}
