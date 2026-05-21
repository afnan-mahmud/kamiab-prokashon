'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

const CLARITY_ID = 'wuryo1a9ta';

export function ClarityScript() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;

  return (
    <Script id="ms-clarity" strategy="afterInteractive">{`
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window,document,"clarity","script","${CLARITY_ID}");
    `}</Script>
  );
}
