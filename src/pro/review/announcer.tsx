/** @jsxImportSource react */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export interface AnnounceOptions {
  /** Also show the message on screen for a moment. Use for results a sighted user needs to see, such as "Link copied". */
  toast?: boolean;
}

type Announce = (message: string, options?: AnnounceOptions) => void;

const AnnounceContext = createContext<Announce>(() => {});

export const useAnnounce = () => useContext(AnnounceContext);

const TOAST_MS = 2400;

/**
 * The Review tier's one polite live region, plus an on-screen toast for action results. Video.js's own
 * `StatusAnnouncer` keeps announcing the built-in actions (play, mute, captions); it has no way to speak custom text,
 * so pro messages go through this region instead. Each message is spoken once.
 */
export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [spoken, setSpoken] = useState({ text: '', id: 0 });
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef(0);

  const announce = useCallback<Announce>((message, options) => {
    setSpoken((current) => ({ text: message, id: current.id + 1 }));
    if (options?.toast) {
      setToast(message);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setToast(null), TOAST_MS);
    }
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const value = useMemo(() => announce, [announce]);

  return (
    <AnnounceContext.Provider value={value}>
      {children}
      <div className={'media-status-announcer'} role="status" aria-live="polite" aria-atomic="true">
        {/* The key remounts the text so the same message twice in a row is spoken twice. */}
        <span key={spoken.id}>{spoken.text}</span>
      </div>
      {toast && (
        <div className={'pro-toast'} aria-hidden="true">
          {toast}
        </div>
      )}
    </AnnounceContext.Provider>
  );
}
