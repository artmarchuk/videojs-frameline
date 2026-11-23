/** @jsxImportSource react */

import { createContext, useContext, useEffect, useState } from 'react';

/**
 * What the Viewer skin shows when the pro code could not load: a message for the live region, and a retry for the
 * settings menu while one is on offer. `null` everywhere else, which is every normal state.
 */
export interface ProFallback {
  /** Announced once, politely. */
  notice: string;
  /** Tries to load the pro code again. Not set once a retry has been used. */
  retry?: (() => void) | undefined;
}

const ProFallbackContext = createContext<ProFallback | null>(null);

export const ProFallbackProvider = ProFallbackContext.Provider;

export function useProFallback(): ProFallback | null {
  return useContext(ProFallbackContext);
}

/**
 * The live region for the fallback's message. It is rendered only after a failure, so the Viewer's markup is
 * unchanged otherwise. The region mounts empty and gets its text a moment later: a screen reader announces a change
 * inside a live region, not a region that arrives with its text. The text is set once and never changes, so it is
 * announced once.
 */
export function ProNotice() {
  const fallback = useProFallback();
  const [shown, setShown] = useState(false);
  const notice = fallback?.notice;
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setShown(true), 150);
    return () => window.clearTimeout(timer);
  }, [notice]);
  if (!notice) return null;
  return (
    <div className={'media-status-announcer'} role="status" aria-live="polite" aria-atomic="true" data-pro-notice="">
      {shown ? notice : ''}
    </div>
  );
}
