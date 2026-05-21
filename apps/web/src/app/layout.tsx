import type { Metadata } from 'next';
import { Hind_Siliguri } from 'next/font/google';
import { Toaster } from 'sonner';
import { Providers } from '@/components/providers';
import { PixelScript } from '@/components/pixel-script';
import './globals.css';

const hindSiliguri = Hind_Siliguri({
  subsets: ['bengali', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-hind-siliguri',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Cholon Bil Organic | অর্গানিক খাদ্যপণ্য',
    template: '%s | Cholon Bil Organic',
  },
  description:
    'বাংলাদেশের সেরা অর্গানিক খাদ্যপণ্য — চাল, মধু, মশলা, মিষ্টি এবং আরও অনেক কিছু।',
  keywords: ['organic', 'বাংলাদেশ', 'চাল', 'মধু', 'মশলা', 'অর্গানিক খাদ্য'],
  openGraph: {
    siteName: 'Cholon Bil Organic',
    locale: 'bn_BD',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn" className={hindSiliguri.variable}>
      <body>
        <PixelScript />
        <Providers>
          {children}
        </Providers>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
