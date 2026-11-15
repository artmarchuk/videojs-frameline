import { useEffect, useState, type RefObject } from 'react';

/** Below this control-bar width the seek bar sits on its own row above the buttons. Mirrors the CSS breakpoint. */
export const STACKED_BELOW = 640;

/**
 * Reports whether the control bar is narrower than the wide breakpoint. CSS container queries do the visual work;
 * this only exists so the DOM order (and with it the focus order) can follow the visual order in both layouts.
 */
export function useStacked(ref: RefObject<HTMLElement | null>): boolean {
  const [stacked, setStacked] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const update = (width: number) => setStacked(width > 0 && width < STACKED_BELOW);
    update(element.getBoundingClientRect().width);

    // Measure the border box, the same box the container query measures.
    const observer = new ResizeObserver(() => update(element.getBoundingClientRect().width));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return stacked;
}
