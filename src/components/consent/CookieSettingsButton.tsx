'use client';

import { useConsent } from './ConsentProvider';

export function CookieSettingsButton() {
  const { reset } = useConsent();
  return (
    <button type="button" onClick={reset} className="underline underline-offset-4 hover:text-white">
      Cookie settings
    </button>
  );
}
