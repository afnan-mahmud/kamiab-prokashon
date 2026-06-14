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
  metadataBase: new URL('https://kamiabprokashon.xyz'),
  title: {
    default: 'Kamiab Prokashon | ইসলামী গ্রন্থ প্রকাশক ও বিক্রেতা',
    template: '%s | Kamiab Prokashon',
  },
  description:
    'কামিয়াব প্রকাশন — ইসলামী গ্রন্থ প্রকাশক ও বিক্রেতা। তাফসীর, হাদিস, ফিকহ, সীরাত ও মানসম্পন্ন ইসলামী বইয়ের নির্ভরযোগ্য ঠিকানা। সারা বাংলাদেশে দ্রুত ডেলিভারি।',
  keywords: ['ইসলামী বই', 'বই', 'কামিয়াব প্রকাশন', 'Kamiab Prokashon', 'Islamic books', 'তাফসীর', 'হাদিস', 'বাংলাবাজার', 'বাংলাদেশ'],
  openGraph: {
    siteName: 'Kamiab Prokashon',
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
