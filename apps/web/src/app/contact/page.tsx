import { Phone, Mail, MapPin, Facebook } from 'lucide-react';
import { PublicLayout } from '@/components/layout/public-layout';
import { BRAND } from '@/lib/brand';

export const metadata = {
  title: 'যোগাযোগ — ' + BRAND.nameEn,
};

export default function ContactPage() {
  return (
    <PublicLayout>
      <div className="container-page py-12">
        <h1 className="mb-2 text-3xl font-bold">যোগাযোগ</h1>
        <p className="mb-10 text-muted-foreground">{BRAND.sloganBn}</p>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Phone */}
          <a
            href={`tel:${BRAND.phone.replace(/-/g, '')}`}
            className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Phone className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                ফোন
              </p>
              <p className="mt-0.5 font-medium">{BRAND.phone}</p>
            </div>
          </a>

          {/* Email */}
          <a
            href={`mailto:${BRAND.email}`}
            className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                ইমেইল
              </p>
              <p className="mt-0.5 font-medium break-all">{BRAND.email}</p>
            </div>
          </a>

          {/* Address */}
          <div className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:col-span-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                ঠিকানা
              </p>
              <p className="mt-0.5 font-medium">{BRAND.address}</p>
            </div>
          </div>

          {/* Facebook */}
          <a
            href={BRAND.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md sm:col-span-2"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Facebook className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                ফেসবুক
              </p>
              <p className="mt-0.5 font-medium text-primary">{BRAND.facebook}</p>
            </div>
          </a>
        </div>
      </div>
    </PublicLayout>
  );
}
