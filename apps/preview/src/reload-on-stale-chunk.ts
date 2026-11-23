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
 * throw, so a chunk that is really missing cannot loop the page. The flag is cleared once the page has been loaded
 * for a while with no failed import, so a later deploy in the same tab gets its own reload. Without `sessionStorage`
 * (blocked storage) nothing reloads: there would be no way to stop a loop.
 *
 * Each entry calls `reloadOnStaleChunk()`. An import for its side effect alone would be dropped from the build:
 * `package.json` declares only CSS files as having side effects.
 */
const FLAG = 'frameline:reloaded-for-stale-chunk';
/** How long after `load` a page counts as loaded: the lazy chunks of a page are requested well within this. */
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

  const settle = () =>
    window.setTimeout(() => {
      if (failed) return;
      try {
        sessionStorage.removeItem(FLAG);
      } catch {
        // No storage, no flag.
      }
    }, SETTLED_MS);

  if (document.readyState === 'complete') settle();
  else window.addEventListener('load', settle, { once: true });
}
