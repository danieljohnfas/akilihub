'use client';

import Link from 'next/link';
import { useConsent } from './ConsentProvider';

export function ConsentBanner() {
  const { consent, ready, grant, deny } = useConsent();
  if (!ready || consent !== 'unknown') return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie and privacy choices"
      className="fixed inset-x-0 bottom-0 z-[100] border-t border-white/10 bg-background/95 p-4 shadow-2xl backdrop-blur"
    >
      <div className="container mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          We use essential cookies to run the site. With your permission we also use analytics, session recording and
          personalised advertising to improve AkiliBrain. Without it you will only see non-personalised ads.{' '}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
            Privacy policy
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={deny}
            className="rounded-md border border-white/15 px-4 py-2 text-sm hover:bg-white/5"
          >
            Reject non-essential
          </button>
          <button
            type="button"
            onClick={grant}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
