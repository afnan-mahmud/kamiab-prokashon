'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { LandingPageBuilder } from '@/features/landing-pages/landing-page-builder';
import { landingPagesApi } from '@/features/landing-pages/landing-pages.api';

export default function EditLandingPagePage() {
  const { id } = useParams<{ id: string }>();

  const { data: lp, isLoading } = useQuery({
    queryKey: ['admin-landing-page', id],
    queryFn: () => landingPagesApi.get(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!lp) {
    return <p className="py-16 text-center text-muted-foreground">Landing page not found</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Edit — {lp.name}</h1>
      <LandingPageBuilder initial={lp} />
    </div>
  );
}
