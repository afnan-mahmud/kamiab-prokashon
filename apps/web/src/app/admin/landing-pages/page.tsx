'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Plus, Eye, Pencil, Trash2, Copy, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Can } from '@/components/can';
import { landingPagesApi } from '@/features/landing-pages/landing-pages.api';

const TEMPLATE_LABELS: Record<string, string> = {
  template1: 'Template 1 — Bold Hero',
  template2: 'Template 2 — Minimal',
  template3: 'Template 3 — Story',
  template4: 'Template 4 — Grid',
};

export default function LandingPagesPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-landing-pages'],
    queryFn: () => landingPagesApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => landingPagesApi.delete(id),
    onSuccess: () => {
      toast.success('Landing page deleted');
      void queryClient.invalidateQueries({ queryKey: ['admin-landing-pages'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const pages = data?.data ?? [];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Landing Pages</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{pages.length} pages</p>
        </div>
        <Can permission="landing.create">
          <Button asChild>
            <Link href="/admin/landing-pages/new">
              <Plus className="mr-1.5 h-4 w-4" />
              New Landing Page
            </Link>
          </Button>
        </Can>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : pages.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-24 text-muted-foreground">
          <BarChart2 className="mb-3 h-10 w-10 opacity-30" />
          <p className="font-medium">No landing pages yet</p>
          <p className="mt-1 text-sm">Create your first landing page to start tracking conversions</p>
          <Can permission="landing.create">
            <Button asChild className="mt-4">
              <Link href="/admin/landing-pages/new">
                <Plus className="mr-1.5 h-4 w-4" /> Create one
              </Link>
            </Button>
          </Can>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((lp) => (
            <div key={lp._id} className="rounded-xl border border-border bg-white shadow-sm hover:shadow-md transition-shadow">
              {/* Hero preview strip */}
              <div
                className="h-3 rounded-t-xl"
                style={{ backgroundColor: lp.content.colors?.primary ?? '#4a7c2e' }}
              />
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{lp.name}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">/{lp.slug}</p>
                  </div>
                  <Badge variant={lp.isActive ? 'default' : 'secondary'} className="shrink-0 text-xs">
                    {lp.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground">{TEMPLATE_LABELS[lp.template] ?? lp.template}</p>

                {/* Stats */}
                <div className="flex gap-4 text-sm">
                  <div>
                    <p className="font-semibold">{lp.views.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Views</p>
                  </div>
                  <div>
                    <p className="font-semibold">{lp.conversions.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Orders</p>
                  </div>
                  <div>
                    <p className="font-semibold">
                      {lp.views > 0 ? ((lp.conversions / lp.views) * 100).toFixed(1) : '0'}%
                    </p>
                    <p className="text-xs text-muted-foreground">Conv. rate</p>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Created {format(new Date(lp.createdAt), 'dd MMM yyyy')}
                </p>

                {/* Actions */}
                <div className="flex items-center gap-1 pt-1 border-t border-border">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 px-2 text-xs"
                    onClick={() => {
                      void navigator.clipboard.writeText(`${siteUrl}/step/${lp.slug}`);
                      toast.success('URL copied!');
                    }}
                  >
                    <Copy className="h-3 w-3" /> Copy URL
                  </Button>
                  <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-xs">
                    <Link href={`/step/${lp.slug}`} target="_blank">
                      <Eye className="h-3 w-3 mr-1" /> Preview
                    </Link>
                  </Button>
                  <div className="ml-auto flex gap-1">
                    <Can permission="landing.edit">
                      <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0">
                        <Link href={`/admin/landing-pages/${lp._id}/edit`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </Can>
                    <Can permission="landing.delete">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Delete "${lp.name}"?`)) {
                            deleteMutation.mutate(lp._id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </Can>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
