/**
 * Reloads the page once when a lazily loaded chunk of this build no longer exists on the server.
 *
 * After a deploy the old chunks are gone. A browser can still show the old page: the Back button takes `index.html`
 * from the HTTP cache without asking the server, and the old static chunks come from the cache with it. The first
 * `import()` that goes to the network (the pro runtime, the Studio layer) then gets a 404, the import rejects, and
 * React unmounts the player. Vite reports such a failure as a `vite:preloadError` event before the error is thrown.
 * A reload asks the server for `index.html` again and gets the current build.
 *
 * One reload only. The flag in `sessionStorage` survives the reload: if the import fails again, the error is left to
 * throw, so a chunk that is really missing cannot loop the page. The flag is cleared when the page has loaded for
 * good, so a later deploy in the same tab gets its own reload: when the skin reports that its pro code is on screen
 * (`data-pro-ready` on its root), or, on a page whose player has no pro bar, after ten seconds with no failed import.
 * Without `sessionStorage` (blocked storage) nothing reloads: there would be no way to stop a loop.
 *
 * Each entry calls `reloadOnStaleChunk()`. An import for its side effect alone would be dropped from the build:
 * `package.json` declares only CSS files as having side effects.
 */
const FLAG = 'frameline:reloaded-for-stale-chunk';
/** On a page without a pro player: how long after `load` it counts as loaded. */
const SETTLED_MS = 10_000;

export function reloadOnStaleChunk(): void {
  let failed = false;

  window.addEventListener('vite:preloadError', () => {
    failed = true;
    try {
      if (sessionStorage.getItem(FLAG)) return;
      sessionStorage.setItem(FLAG, '1');
    } catch {
      return;
    }
    // The import error is still thrown (no `preventDefault()`), so the console names the chunk that was missing.
    window.location.reload();
  });

  const clear = () => {
    if (failed) return;
    try {
      sessionStorage.removeItem(FLAG);
    } catch {
      // No storage, no flag.
    }
  };

  // The skin's signal: every lazy chunk the player needs has arrived and rendered.
  const ready = () => document.querySelector('.media-skin[data-pro-ready]') !== null;
  if (ready()) clear();
  else {
    const observer = new MutationObserver(() => {
      if (!ready()) return;
      observer.disconnect();
      clear();
    });
    observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-pro-ready'] });
  }

  // The fallback, for a page whose player loads no pro code: there is no signal to wait for.
  const settle = () =>
    window.setTimeout(() => {
      if (document.querySelector('.media-skin[data-bar="pro"]') === null) clear();
    }, SETTLED_MS);

  if (document.readyState === 'complete') settle();
  else window.addEventListener('load', settle, { once: true });
}
