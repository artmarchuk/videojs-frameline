# The skin survives a pro chunk that fails to load

When the pro runtime, Studio or the debug readout fails to load, the skin keeps a working Viewer and says what happened. Today the rejected `lazy()` import throws during render, and React unmounts the player. In a host app it unmounts the host's whole React root. A host hits this after any deploy that removes old chunks (see "Stale chunks" in `NOTES.md`). This blocks the 0.1.0 publish.

Read first: `CLAUDE.md`, `specs/PROJECT-OVERVIEW.md`, `NOTES.md` (the stale-chunk entry), `src/pro/frameline-skin.tsx`, `src/pro/runtime/index.tsx`, `apps/preview/src/reload-on-stale-chunk.ts`, `scripts/browser-checks/stale-chunk-reload.js`.

The repo is public: commit messages, comments and docs are written for an outside reader.

## Delivery

Work on a new branch, `pro-chunk-boundary`, in your own folder. Merge as `CLAUDE.md` says. Production after the merge, with the live checks below. This touches what the embed loads, so hard rule 8 applies.

## 1. Behaviour (decided)

- **One error boundary around each lazy pro chunk:** the runtime in `frameline-skin.tsx`, and Studio and the debug readout in `runtime/index.tsx`. A failure in one chunk never takes down more than that chunk.
- **The fallback is the working Viewer.** If the runtime or Studio fails, the player renders as the Viewer tier with its overlay bar: play, seek, volume, captions, settings and fullscreen all work. It renders no empty dock slots and no half-built dock, and the layout doesn't jump more than the change of bar requires. If only the debug readout fails, Studio stays and the readout is simply absent.
- **Announced once.** A polite live-region message, a new string in `strings.ts`: "Studio tools could not load. The player works without them." It is not a dialog and not an error dialog: the media itself is fine.
- **A retry, offered once.** The Settings menu gets an item, "Retry loading Studio tools". It creates a fresh `lazy()`, since React caches the rejected one. If the retry fails too, the item goes away and nothing more is announced. Say in a comment why a retry rarely helps after a deploy (the file is gone): the host's reload handles that case, not the skin.
- **The skin never reloads the page.** That decision belongs to the host.
- **No new public API.** No `onError` prop in 0.1: hosts already get their bundler's own event (for example Vite's `vite:preloadError`), because our chunks are part of their build. Say so in the README, in a short "When a chunk fails to load" section, together with the 3-line reload pattern hosts can copy.
- **A signal the site can use.** After a successful pro load, the skin sets `data-pro-ready` on its root element. `reload-on-stale-chunk.ts` then clears its flag on that signal instead of after 10 quiet seconds. Keep the 10-second rule only as a fallback for pages without a pro tier. `data-pro-ready` is an internal attribute: don't document it in the README.
- **The Viewer path stays light.** The boundary is a few lines in the Viewer chunk. Report its size; it must not pull anything from the pro chunks.

## 2. A recorded trap

`package.json`'s `sideEffects: ["**/*.css"]` also applies to the site, so an import done only for its side effect is silently dropped from the site build. You met this in the stale-chunk fix. Record it in `NOTES.md`, under Architecture or Decisions, in one or two lines.

## Verification

- Typecheck, unit tests, `build`, `build:lib`, the contrast script and `check:consumer` pass.
- **A new browser check, `pro-chunk-failure.js`.** For each chunk (runtime, Studio, debug), make the request answer 404 (with `page.route`, or the deploy server fixture), then check:
  - the player renders and plays as the Viewer;
  - the message is announced once;
  - the Settings item appears;
  - a retry against a now-working route loads Studio;
  - a failed retry removes the item.

  Run it in all three engines, on `/preview.html` and on the landing page.
- **The consumer app:** add a case where a pro chunk 404s. The host's root keeps its own content, and the player is a working Viewer.
- `dom-snapshot.js`: no difference in any normal state.
- `stale-chunk-reload.js` still passes, now clearing its flag on `data-pro-ready`.
- Hard rule 8: `embed-link.js` in all three engines, and after the production deploy the artmarchuk.me page plays, steps frames, and its copied link opens that frame.
- Screenshots, opened and looked at: Studio failing on the landing page at 1440 and 390 px, showing the Viewer fallback and the Settings item.
- Update `NOTES.md` (the stale-chunk entry, one Log line), `FEATURES.md` and `CHANGELOG.md` (under 0.1.0).

## Report

One line per section, the Viewer chunk size before and after, the check results per engine, the production checks, the clean-up, and what you could not verify.
