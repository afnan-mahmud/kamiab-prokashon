'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export function PixelScript() {
  const pathname = usePathname();
  if (!PIXEL_ID || pathname.startsWith('/admin')) return null;

  return (
    <>
      <Script id="fb-pixel" strategy="afterInteractive">{`
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){
        n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
        s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
        (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init','${PIXEL_ID}');
        fbq('track','PageView');
      `}</Script>
      {/*
        No <noscript> fallback img on purpose. This is a JS-driven SPA, so a
        no-JS visitor can't use the site anyway. Worse: Next.js auto-preloads
        any <img> src (even inside <noscript>) as `<link rel="preload" as="image">`,
        which performs a real GET to facebook.com/tr WITH JS enabled — firing a
        duplicate PageView on every page load in addition to the fbq PageView.
      */}
    </>
  );
}
