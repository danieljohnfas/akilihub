'use client';

import { useEffect } from 'react';

interface AdSlotProps {
  slotId: string;
  format?: 'auto' | 'rectangle' | 'horizontal';
}

export function AdSlot({ slotId, format = 'auto' }: AdSlotProps) {
  useEffect(() => {
    try {
      // @ts-expect-error
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense error', err);
    }
  }, []);

  return (
    <div className="w-full overflow-hidden text-center flex justify-center py-4 my-4 bg-muted/20 border border-muted/50 rounded-lg">
      <ins
        className="adsbygoogle w-full"
        style={{ display: 'block' }}
        data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_PUB_ID}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
