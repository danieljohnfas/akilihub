'use client';

import { useEffect } from 'react';

interface AdSlotProps {
  slotId?: string;
  format?: 'auto' | 'rectangle' | 'horizontal';
  className?: string;
}

const PUB_ID = process.env.NEXT_PUBLIC_ADSENSE_PUB_ID || 'ca-pub-2501499631331261';

export function AdSlot({ slotId, format = 'auto', className = '' }: AdSlotProps) {
  // AdSense slot IDs must be numeric (e.g. "1234567890"). If placeholder string or empty, don't render empty box.
  const isNumericSlot = slotId && /^\d+$/.test(slotId);

  useEffect(() => {
    if (!isNumericSlot) return;
    try {
      // @ts-expect-error window.adsbygoogle definition
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense error', err);
    }
  }, [isNumericSlot]);

  if (!isNumericSlot) {
    return null;
  }

  return (
    <div className={`w-full overflow-hidden text-center flex justify-center my-4 ${className}`}>
      <ins
        className="adsbygoogle w-full"
        style={{ display: 'block' }}
        data-ad-client={PUB_ID}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}

