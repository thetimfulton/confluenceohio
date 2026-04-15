'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

const GA4_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

export function GA4ConsentLoader() {
  const [consentGranted, setConsentGranted] = useState(false);

  useEffect(() => {
    // Session-scoped consent — resets between sessions for extra privacy
    const consent = sessionStorage.getItem('analytics_consent');
    if (consent === 'granted') {
      setConsentGranted(true);
    }

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.analytics === true) {
        sessionStorage.setItem('analytics_consent', 'granted');
        setConsentGranted(true);
      }
    };
    window.addEventListener('analytics-consent', handler);
    return () => window.removeEventListener('analytics-consent', handler);
  }, []);

  if (!consentGranted || !GA4_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('consent', 'update', {
            'analytics_storage': 'granted'
          });
          gtag('config', '${GA4_ID}', {
            send_page_view: true,
          });
        `}
      </Script>
    </>
  );
}
