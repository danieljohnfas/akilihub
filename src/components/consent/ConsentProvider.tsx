'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'akilibrain-consent-v1';

export type Consent = 'unknown' | 'granted' | 'denied';

interface ConsentContextValue {
  consent: Consent;
  /** True once the stored choice has been read (avoids a banner flash for returning visitors). */
  ready: boolean;
  grant: () => void;
  deny: () => void;
  /** Re-opens the banner ("Cookie settings"). */
  reset: () => void;
}

const ConsentContext = createContext<ConsentContextValue>({
  consent: 'unknown',
  ready: false,
  grant: () => undefined,
  deny: () => undefined,
  reset: () => undefined,
});

/**
 * Holds the visitor's choice about non-essential tracking (session recording, product analytics,
 * personalised ads). Nothing non-essential loads until the choice is `granted`.
 */
export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<Consent>('unknown');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe: localStorage can only be read after hydration
      if (stored === 'granted' || stored === 'denied') setConsent(stored);
    } catch {
      /* storage unavailable (private mode) — treat as undecided */
    }
    setReady(true);
  }, []);

  const persist = useCallback((value: Consent) => {
    setConsent(value);
    try {
      if (value === 'unknown') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<ConsentContextValue>(
    () => ({
      consent,
      ready,
      grant: () => persist('granted'),
      deny: () => persist('denied'),
      reset: () => persist('unknown'),
    }),
    [consent, ready, persist]
  );

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export const useConsent = () => useContext(ConsentContext);
