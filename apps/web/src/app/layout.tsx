import type { Metadata } from 'next';
import { Hind_Siliguri } from 'next/font/google';
import { Toaster } from 'sonner';
import { Providers } from '@/components/providers';
import { PixelScript } from '@/components/pixel-script';
import { ClarityScript } from '@/components/clarity-script';
import { GtmScript, GtmNoScript } from '@/components/gtm-script';
import './globals.css';

const hindSiliguri = Hind_Siliguri({
  subsets: ['bengali', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-hind-siliguri',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Shukhi Life | ন্যাচারাল হেলথ সলিউশন',
    template: '%s | Shukhi Life',
  },
  description:
    'দিন শুরু হোক সুখী লাইফের সাথে। Shukhi Life — প্রাকৃতিক হার্বস ও অর্গানিক হেলথ সলিউশন। সুস্থ ও সুখী জীবনের জন্য বিশ্বস্ত ন্যাচারাল মেডিসিন।',
  keywords: ['natural health solution', 'herbal', 'অর্গানিক হার্বস', 'ন্যাচারাল মেডিসিন', 'হেলথ সলিউশন', 'বাংলাদেশ'],
  openGraph: {
    siteName: 'Shukhi Life',
    locale: 'bn_BD',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className={hindSiliguri.variable}>
      <body>
        <GtmNoScript />
        <GtmScript />
        <PixelScript />
        <ClarityScript />
        <Providers>
          {children}
        </Providers>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
