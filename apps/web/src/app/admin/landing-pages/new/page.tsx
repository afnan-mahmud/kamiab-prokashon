'use client';

import { LandingPageBuilder } from '@/features/landing-pages/landing-page-builder';

export default function NewLandingPagePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">New Landing Page</h1>
      <LandingPageBuilder />
    </div>
  );
}
