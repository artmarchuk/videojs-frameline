/** @jsxImportSource react */

import { useEffect } from 'react';

/**
 * Keeps keyboard focus inside the player when it leaves fullscreen. Entering and leaving fullscreen can drop focus to
 * the page body (a control that was focused may be hidden or re-laid out by then); a keyboard user would then have to
 * Tab from the top of the page. When that happens, focus goes back to the fullscreen button, the control that
 * started it (or to the container when that button is hidden). Focus that is already somewhere (inside the player or not) is left alone.
 *
 * Video.js requests fullscreen on the player container (`requestFullscreen(container, media)` in
 * `@videojs/core` `dom/presentation/fullscreen.js`); nothing here depends on the container being focusable.
 */
export function FullscreenFocus() {
  useEffect(() => {
    const doc = document as Document & { webkitFullscreenElement?: Element | null };
    let container: Element | null = null;

    const onChange = () => {
      const element = doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
      if (element) {
        container = element;
        return;
      }
      const left = container;
      container = null;
      if (!left?.isConnected) return;
      // After the browser has finished leaving fullscreen and restored its own focus.
      window.setTimeout(() => {
        const active = document.activeElement;
        if (active && active !== document.body) return;
        // The button may be hidden (the Viewer's controls auto-hide, and a hidden control cannot take focus): then the
        // container, which is focusable from code, so the hotkeys keep working.
        left.querySelector<HTMLElement>('.media-fullscreen-button')?.focus({ preventScroll: true });
        if (document.activeElement === document.body || !document.activeElement) (left as HTMLElement).focus({ preventScroll: true });
      }, 0);
    };

    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  return null;
}
