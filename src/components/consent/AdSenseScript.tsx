'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { useConsent } from './ConsentProvider';

/**
 * Loads AdSense, but tells it to serve NON-personalised ads unless the visitor accepted.
 */
export function AdSenseScript({ pubId }: { pubId: string }) {
  const { consent } = useConsent();

  useEffect(() => {
    const w = window as unknown as { adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number } };
    w.adsbygoogle = w.adsbygoogle || [];
    w.adsbygoogle.requestNonPersonalizedAds = consent === 'granted' ? 0 : 1;
  }, [consent]);

  return (
    <Script
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(pubId)}`}
      strategy="afterInteractive"
      crossOrigin="anonymous"
    />
  );
}
