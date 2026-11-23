# NOTES

## About this file

This is the current state of the project, kept short (250 lines at most). A session updates the section its change affects, replaces any line its change makes untrue, and adds one line to the Log. Reports and step detail stay out. The full build log from step 1 to frame links (15–22 Nov 2026) is in [`docs/history/NOTES-2026-11.md`](docs/history/NOTES-2026-11.md); section names in quotes below are sections of that file.

Names: the skin is **Frameline** (`FramelineSkin`, `--fl-*` tokens, storage key `frameline:v1`). Internal names still say "pro": `src/pro/`, the `.pro-*` classes, `data-pro-*`, `ProStore`, and the Vercel project was `videojs-pro` until it was renamed `videojs-frameline` (same project ID). The model file `src/pro/view.ts` holds the Guides state.

## Versions

| What | Version |
| --- | --- |
| Node.js | 26 (`.nvmrc`, for contributors and a future CI; 26.3.0 on the author's machine, which builds the site). `package.json` has no `engines`, so npm warns no host about its Node.js version. Vercel takes the Node.js major from the project setting (Settings, Build and Deployment, Node.js Version; 26.x for this project), and `engines.node` in `package.json` would override it (https://vercel.com/docs/functions/runtimes/node-js/node-js-versions, read 23 Nov 2026: 26.x is the default, 24.x and 22.x are offered). Vercel does not read `.nvmrc`. The site is built on the deploying machine: `vercel build` runs `vite build` with the local Node.js and `vercel deploy --prebuilt` uploads static files, no functions. The tooling's floor is 22.12: Vite 8 needs `^20.19.0 \|\| >=22.12.0`, Vitest 5 `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0` (their `package.json`) |
| npm | 11.16.0, `package-lock.json` committed |
| `@videojs/react`, `@videojs/core`, `@videojs/utils` (peers `>=10.4.0 <10.7.0`, devDependencies for the site), `@videojs/mux-video` (devDependency) | 10.6.0, the latest on npm on 23 Nov 2026; the transitive `@videojs/*` packages and the `video.js` v10 pointer package are 10.6.0 too (`npm ls`). hls.js arrives through them at 1.7.4 |
| React, React DOM | 19.3.1 (peers `^19.3.0`, devDependencies for the site) |
| `cn` | 0.4.0, a devDependency of the CLI's workbench shell only. The skin joins its class names itself (`src/lib/resolve-class-name.ts`), and the package has no runtime dependency |
| Vite, TypeScript, Vitest | 8.3.8, 7.0.2, 5.1.0 |
| `playwright-core`, `@axe-core/playwright` | 1.65.1, 4.14.0 (the browser checks) |
| `sharp`, `@phosphor-icons/core` | 0.35.5, 2.1.1; sharp makes the landing screenshots, Phosphor is only read (path data is copied into the source) |
| Deploy CLIs | `vercel@66` (66.6.0 was the latest on 23 Nov 2026), `netlify-cli@27`, `wrangler@4`, through `npx` in the package scripts |

**Pins and ranges.** In the repo every dependency and devDependency has an exact version, the one the lockfile resolves, and the lockfile is committed. The package's peer ranges are a separate thing: they say which versions a host may install beside Frameline, and cover only what was tested: `react` and `react-dom` `^19.3.0`, `@videojs/*` `>=10.4.0 <10.7.0`. That range is tested at both ends (`npm run check:consumer -- --videojs=10.4.0`, and without the option for the repo's own version); the next minor is added after it passes, because Video.js 10 has renamed public things between minor versions. Tailwind, Base UI, Heroicons and `cn` are devDependencies of the CLI's workbench shell only; the skin is plain CSS.

## URLs and deploys

- **Canonical:** https://frameline.artmarchuk.me, a custom domain on the Vercel project `videojs-frameline`. `videojs-frameline.vercel.app` redirects to it. Repo: https://github.com/artmarchuk/videojs-frameline.
- **`/`** the landing page with the configurator: `?tier=viewer|studio` always, `?layout=` and one parameter per flag (`zoom=0`, `timecode=1`) where they differ from the tier; `media`, `debug` and a frame link in the hash survive. The four flag names from before API 0.1 (`inOut`, `shotNav`, `copyTimecodeLink`, `platformZones`) are still read, as `range`, `cuts`, `copyLink` and `zones`; the page writes only the new names (`OLD_PARAMETERS` in `apps/preview/src/page/config.ts`).
- **`/preview.html`** the monitor page, opens in Studio: `?tier=viewer`, `?density=compact`, `?layout=dock|overlay`, `?guides=title-safe,9:16` (or `0`), `?zones=0`, `?zoom=0`, `?cap=1` (puts the rendition cap back), `?media=cosmicDawn|plain|nocors|error`, `?debug`; in the hash `#width=`, `ratio=`, `autoplay=1&muted=1`.
- **`/embed.html`** the player alone, for an iframe: `?src=` (or `?mux=<playback ID>`), `tier`, `fps`, `poster`. The README has the table and the iframe snippet. https://artmarchuk.me/videojs-frameline-skin.html (linked from that site's home page) embeds `/embed.html?tier=studio&fps=24&mux=…` in an iframe with `allow="fullscreen; picture-in-picture; clipboard-write"` (read from the page's HTML on 23 Nov 2026).
- **`/workbench.html`** the CLI's workbench; **`/two-players.html`** two players on one page, for its check.
- **Previews** are behind the Vercel login (Deployment Protection is on for previews only), so a preview URL answers with a redirect; production answers 200 with no login.
- **Deploying:** the rules are in `CLAUDE.md`, "Branches and deploys". `npm run deploy vercel` runs `apps/preview/deploy-guard.mjs` first, which refuses anything but a clean checkout of `origin/main`; a branch gets `npm run preview:vercel`.
- `og.png` is a static file the author maintains by hand (`design/og.png` copied to `apps/preview/public/og.png`); no script writes it.

## Architecture

- **Public surface.** `src/pro/index.ts` exports only what a host may use: `FramelineSkin`, its props and slots types, `FramelineApi`, the payload, id and level types (all prefixed `Frameline`), `TIERS` and `GUIDE_IDS`. `TIER_DEFAULTS`, `resolveFeatures` and `resolveLayout` are internal; the site imports them from `@/pro/features`. The naming rules are in the README, "API conventions". The package build is step B.
- **The npm package** (`videojs-frameline`, not published yet): `npm run build:lib` builds `lib/` with `vite.lib.config.ts` (library mode, ESM, ES2022, unminified, no source maps). React, React DOM and every `@videojs/*` import stay external; nothing else is imported. The chunks follow the source: the entry (the Viewer and the flag resolver), a shared Viewer chunk, the pro runtime, Studio and the debug readout, the last three loaded with `import()`. Types come from `tsc -p tsconfig.lib.json` into `lib/types` (80 files, entry `lib/types/pro/index.d.ts`); `scripts/lib/clean-types.mjs` removes the source's CSS imports from them. Inside `src/` all imports are relative; only the site uses the `@/` alias.
- **CSS in the package.** Each JS chunk imports its own CSS file (`import './studio-….css';`), as each module does in the source. Library mode writes the CSS files but leaves those imports out, so a small plugin in `vite.lib.config.ts` writes them back. Why: every common bundler handles a CSS import in JS, so a host needs no CSS import of its own and the Studio stylesheet loads with the Studio chunk, never on the Viewer path; nothing injects `<style>` at runtime, so a strict Content Security Policy is fine. The same plugin puts `'use client'` back at the top of the entry (bundlers drop module directives) and drops Rolldown's module path labels. `process.env.NODE_ENV` stays in the output, for the host's bundler. `sideEffects: ["**/*.css"]` keeps the CSS imports from being shaken out.
- **Loading.** `src/video/skin.tsx` is the Viewer skin and the only code a Viewer loads. `src/pro/frameline-skin.tsx` resolves the tier and flags (`features.ts`) and, when any pro feature or the `debug` prop is on, lazy-loads the pro runtime (`src/pro/runtime/`: store, frame clock, timecode) and then the Studio module (`src/pro/studio/`, one JS and one CSS chunk). The Viewer skin renders empty slots in its bar (`src/video/pro-slots.tsx`) and the Studio module portals its controls into them, so they sit in the bar's layout and focus order while their code stays out of the Viewer path. The dock structure itself (stage above, bar below) is in the Viewer skin, so either tier can use either layout.
- **Pro state** lives in a small store beside the player (`src/pro/store.ts`), one per `FramelineSkin`, read through context and `useSyncExternalStore` selectors. Video.js has no documented custom-feature API and the skin does not own `createPlayer`. The `<video>` element is found by querying the container (`use-video-element.ts`). Guides, crop, zones and the timecode-or-seconds choice persist under one `localStorage` key, read in the store's initialiser; zoom is never stored.
- **Frame clock** (`src/pro/frame-clock.ts`): `requestVideoFrameCallback` where the browser has it, otherwise an approximate fallback from `currentTime` (the field then shows `≈`). After a seek or pause it waits 120 ms for a presented frame, then falls back. Chrome's `mediaTime` is the frame's start; Firefox reports the seek time, so `presentedFrame` in `timecode.ts` floors with a quarter-frame tolerance. Seeks go to the middle of a frame, `(frame + 0.5) / fps`, and a `seeking` listener snaps every Studio seek there. The skin does not re-render per frame: only the timecode field subscribes to the frame.
- **Range engine** (`src/pro/studio/controller.ts`, decision in `playbackDecision`, `studio/logic.ts`): a set range confines playback. Play from outside the range or from the Out frame starts at In; at Out it returns to In, or pauses with Loop off; a user or host seek to outside the range while playing pauses there. The engine tells its own seeks from everyone else's with two flags around `seeking`/`seeked`, so a user seek is never pulled back. Out is reached half a frame early; the Out frame shows for an instant at the loop point.
- **Frame links** (`studio/logic.ts`: `formatLinkPosition`, `readLinkPosition`, `resolveLinkPosition`): a copied link is `#t=<seconds>&tc=<timecode>`, `t` the middle of the frame. Reading takes `tc`, then `t` as an old four-field timecode, as Media Fragments seconds, or as platform shorthand (`1m2s`); the first value inside the media wins. Applying a link pauses and holds the frame for 500 ms after the seek lands, so an autoplaying host stays paused; a play within a second of a trusted press is never paused. Video.js does not read the page URL at all. The Viewer does not read links. What is copied is the host's to decide (`linkUrl`, resolved by the pure `resolveLinkUrl`): the page's URL by default, a base URL, or a synchronous function that returns the full URL or `null`; `linkFragment` is the one place that writes the `t=…&tc=…` pair, for the skin's own links and for the `fragment` a host's function receives.
- **Guides** (`src/pro/studio/guides/`): `pictureRect` in `geometry.ts` computes the picture inside the stage for the video's `object-fit`; `usePictureRect` measures the video element, publishes `--fl-picture-x/y/w/h`, and re-measures on resize, metadata, a new source and fullscreen. Each guide is one SVG the size of the picture; every line is drawn twice (dark edge, white line). Zone numbers are in `platform-zones.ts`, the only file to edit for them.
- **Zoom** (`src/pro/zoom.ts`, `studio/zoom.tsx`): the media, poster and overlay sit in one `div.pro-picture` that takes a `translate() scale()`; the element exists only with the `zoom` flag. 100% is one pixel of the best rendition on offer (`sourceWidth`) per device pixel, so the scale does not change with the playing rendition. Guides scale with the wrapper and divide their strokes by `--fl-zoom-scale`. `useLiftRenditionCap` sets `capRenditionToPlayerSize: false` on the source while zoomed on Auto and puts the host's source back at Fit; it never selects a rendition, so a frame already buffered stays in its rendition.
- **Dock arrangement** (`useDockArrangement`, thresholds in `studio/logic.ts`): wide from a 740 px player with a mouse; narrow below it and always on touch, as `keys` (500 px and up) or `compact`. It is set in script because the DOM order changes with it and the focus order has to follow; everything else is container queries.
- **Debug readout** (`src/pro/debug/`, its own lazy chunk): the frame clock counts presented frames in the store without notifying anyone; the readout samples that counter and `getVideoPlaybackQuality()` every 500 ms into `state.stats` and reads them through selectors, so nothing else re-renders. A missing API shows "—".
- **Site** (`apps/preview/`): `src/frame/media.ts` is the one place that names the demo media (active: `reel`, 56 s, 24 fps, 1920×1072 picture in a 1080 file, no captions; `cosmicDawn` has captions, chapters and 4K). The landing page stages its opening state through `apiRef`, reserves the dock's height before the Studio code arrives, and keeps its global CSS out of the player with `:not(:where(.media-skin *))`.

## Video.js APIs we rely on

Checked against `@videojs/react`, `@videojs/core` and `@videojs/hlsjs-video` 10.4.0 (bundled docs and `dist/` source); details are in the archive's "Verified APIs" sections. On 10.6.0 every subpath the skin imports is still in the `exports` maps, every check passes and the skin's markup is identical (`dom-snapshot.js`).

- **Player:** `createPlayer({ features })` and `VideoPlayer` belong to the host. `usePlayer(selector)` with `selectError`, `selectPiP`, `selectPlayback`, `selectVolume`, `selectQuality`; `useMedia()` returns a handle that is not always the `<video>` element. `definePlayerFeature` exists but is `@internal`.
- **Container:** sets `data-controls-visible`, defaults `tabIndex` to 0 (the skin passes `-1`), and is the fullscreen target, so the dock stays in fullscreen. Media registers through context and need not be a direct child.
- **Controls:** `Controls.Root` (`visibility="always"` for the dock), `Controls.Content`, `Controls.Group`.
- **Sliders:** `TimeSlider.Root / Chapters / Track / Buffer / Fill / Thumb / Preview / Value / ChapterTitle`, `Slider.Thumbnail.Root / Image`, `Thumbnail.Root time=`, `VolumeSlider`. The root owns the pointer and calls the store's `seek()` itself; there is no seek hook. Variables `--media-slider-fill / -pointer / -buffer / -chapter-start / -chapter-end`.
- **Buttons and time:** `PlayButton`, `MuteButton`, `CaptionsButton`, `PiPButton`, `FullscreenButton`, `Time.Value / Group / Separator`. Video.js buttons set no `aria-pressed`.
- **Menus:** `Menu.Root / Trigger / Popup / Content / Item / CheckboxItem / RadioGroup / RadioItem / ItemIndicator / Group / GroupLabel / Separator`, and the `PlaybackRate`, `Quality`, `Captions` and `AudioTrack` radio groups. `Menu.Popup` is the popup (no `Popover`). A checkbox item keeps the menu open; a radio item closes it unless its `onClick` calls `preventDefault()`. A menu opens on its first checked radio item; it measures each child at `max-content`, and sets `--media-menu-width` from that; it positions with the `translate` property. Popup state: `data-open`, `data-starting-style`, `data-ending-style`.
- **Tooltip, dialogs:** `Tooltip.Provider / Root / Trigger / Popup / Label / Shortcut` (a tooltip closes when its trigger is clicked), `Dialog.*`, `ErrorDialog.*`.
- **Keys and gestures:** `Hotkey` and `useHotkey({ keys, onActivate, action, repeatable, disabled })`. Hotkeys are one `keydown` listener on the container; modifiers must match exactly; `Space` and `Enter` on a button, link or slider are never matched; events already `defaultPrevented` are skipped. `Gesture`: a tap is a `pointerup` within 250 ms with no movement threshold, and pointer activity on `data-interactive` is ignored.
- **Feedback:** `StatusAnnouncer` (cannot speak custom text), `StatusIndicator`, `VolumeIndicator`, `SeekIndicator`, `BufferingIndicator`, `Poster`.
- **Quality:** `videoRenditionList`, `activeVideoRendition`; `capRenditionToPlayerSize` is a field of the media `source` and can change at runtime without a reload; MuxVideo makes a storyboard track only from a `{ playbackId }` source.
- **Tokens:** `--media-accent-color`, `--media-border-color`, `--media-border-radius`, `--media-font-family`, `--media-object-fit`, `--media-object-position`, `--media-scale-unit`, `--media-controls-before-start`, `--media-spacing`.

## Decisions

**Product**
- Two tiers: Viewer for watching, Studio for checking timing and framing. Studio adds controls and overlays around the picture and never processes it. Channels, gain and gamma, scopes, an info readout and "Use frame as poster" were removed or never built.
- Names follow one rule since API 0.1 (flags `range`, `cuts`, `copyLink`, `zones`; `onRangeChange`; the guide id `center`; types prefixed `Frameline`). Nobody installed the skin before, so the skin has no aliases. Two pieces of compatibility exist: a remembered `centre` reads as `center` (`parseStored`), and the configurator page reads the old flag names in a URL. `debug` is a prop and `?debug`, not a flag.
- Copy link stays off in the Viewer by default; a host can turn it on. `/embed.html` passes no `linkUrl`, so an embedded player copies its own embed URL with the frame.
- Events are callback props on `FramelineSkin`; the skin dispatches no DOM events. A host drives Studio through `apiRef` (`seek`, `step`, `setRange`, `setLoop`, `setGuides`, `setZoom`, `pan`, `grabFrame`); handle calls are silent for screen readers.
- The skin's own strings are English only (`src/video/strings.ts`, `studio/strings.ts`); Video.js labels follow the locale. The More button's label is ours, so it is English only too.
- The backlog is kept outside the repo since 19 Nov 2026. Ideas go into a step's report.

**Frames, timecode, range**
- `fps` is a plain number; 23.976, 29.97 and 59.94 are recognised by value and resolve to the exact rational. An invalid `fps` falls back to 24.
- In past Out swaps the points and says so; a point exactly on the other is refused. In at 0 and Out at the end count as not set.
- Loop is on from the start: the range when one is set, otherwise the whole video. Clearing the range leaves Loop on.
- Cuts for `[` `]` are the media's chapter starts, otherwise the host's markers; never both.
- Stepping while playing pauses first. Held keys step from the frame last asked for. On the focused seek slider the arrows step a frame while paused and seek 5 s while playing.
- Frame links are `#t=<seconds>&tc=<timecode>`: Media Fragments defines `t` in seconds only, and seconds cannot name a frame, so the timecode travels beside them. Old `#t=HH:MM:SS:FF` links still open. A link past the end is ignored.
- Grab frame draws the raw video: no guides, the same image at any zoom. One button downloads the PNG; copying the image is a second action.
- Timecode display: the leading run of zeros and separators is dimmed, never the frames, never splitting the hours field, nothing in seconds mode. The accessible name is unchanged by the split.

**Layout**
- Studio's controls sit in a dock below the picture, also in fullscreen; the Viewer keeps an overlay. Picture-in-picture is in the More menu in the dock.
- Wide dock: the row sheds controls by player width (volume slider under 1100 px, duration 1040, captions 940, chevrons 900, badges and divider 820) and becomes the narrow dock under 740 px. Touch is always narrow.
- Narrow dock: row one is the instrument, row two the flat toolbar. From 500 px: timecode with Link, the transport, Loop as a key; six cells below. Under 500 px: eight cells, Loop and Link among them. Folds: Zoom under 382 px, Link under 340 px, the cut keys under 324 px; it fits down to a 264 px player. The narrow timecode stays 14 px in a 94 px field so row one needs 322 px.
- Range handles are anchored on their outer edge and always present; hit areas grow away from the range. A press within 10 px of the playhead (22 px on touch) goes to the playhead, also through a pin or handle.
- The media element is not a Tab stop (`tabindex="-1"`, set by the Viewer skin unless the host set one): Firefox made it two. The hotkeys listen on the container, so they work wherever focus is.
- The player container is not a Tab stop; a press inside the player that ends with focus on the body focuses the container, so the keys work.

**Look**
- Every surface is a true grey: dock `#171717`, the timecode well and the timeline groove `#0c0c0c`, seam `#050505`. The accent `#5b9dff` appears only on set handles, the selected marker, focus rings and the light of a mode that is on.
- Three kinds of control in the dock: keys (the transport as one housing of butted tiles, Play, Loop on row one), one display (the timecode with its link), and a flat toolbar. A mode that is on shows a 4 px light; a flat button that is on has no fill.
- One range band, neutral (`--fl-range` `#606060`); no played part. Idle handles are `#a0a0a0`.
- All menus share one surface (`surface-1`, a `#424242` edge in the dock layout). Notes sit at the top of a menu and are its `aria-describedby`.
- Nothing tactile is drawn over the picture: the overlay layout, `prefers-contrast: more` and forced colours are flat (`--fl-bevel` 0).
- Nothing that shows time animates. Presses, hovers, menus and the range band's arrival do; all durations are 0 under reduced motion.
- Icons are copied into the source. Step, Loop, Markers and Capture are our drawings at 18, 20 and 24 px, picked by CSS; frame step is `◀|` `|▶` and cut is `|◀` `▶|`, as in editing software.
- No `@scope`, no CSS nesting; the skin's styles are in cascade layers, so an unlayered element selector on the host page overrides them (README, "Host page styles").

**Keys and menus**
- The YouTube key map is kept in both tiers. Studio adds `,` `.` `Shift+←/→` `I` `O` `Shift+I/O` `R` `[` `]` `G` `Shift+G` `S` `Shift+V` `Z` `Shift+Z` and `Shift+Alt+arrows` (pan, only while zoomed). `Alt+←/→` are left to the browser.
- `Space` on a slider or handle is passed to the player's own hotkey (`passSpaceToPlayer`), because Video.js never matches it there.
- Platform zones use the largest margin where sources disagree, and every platform is labelled approximate.
- Safe areas: action safe 93%, title safe 90% (EBU R95, ITU-R BT.1848). Guides are drawn over captions on purpose.

**Site and demo**
- The landing page is dark only, built from the Figma file; `tokens.css` mirrors the Figma variables and `landing.css` uses only those. It opens staged: range 00:00:02:18 to 00:00:50:16, playhead 00:00:03:02, Title safe, Action safe and the centre cross; a frame link or remembered guides win over the staging.
- The reel's picture is 1920×1072 inside a 1080 file, so the landing and monitor pages give the stage that shape and cover the black rows.
- The "showing 720p" note follows the decoded picture (`videoHeight`, re-read on the element's `resize`), not Video.js's `activeVideoRendition`, which kept the previous rendition after a manual switch. A height within 16 px under the best rendition counts as the best.
- `capRenditionToPlayerSize: false` on every demo source; `?cap=1` restores the cap for the checks that need it.
- The landing page's screenshots come from `scripts/landing-shots.mjs`; after a theme change reaches `main` they are stale until re-shot.
- Credit: the footer reads "Made by Artem Marchuk, with Claude."; the README credits Claude for design thinking, specs and code, with every decision and review Artem's.

## Checks

- `npm run typecheck`, `npm test` (255 unit tests), `npm run build`, `npm run build:lib`.
- `npm run check:consumer` (`scripts/consumer/`): packs the package, makes a Vite + React app outside the repo from `scripts/consumer/template/`, installs the tarball with the peers (Video.js at the repo's version, or at `--videojs=<version>`), runs `tsc` against the published types (with `skipLibCheck: false`), builds and serves it on 127.0.0.1:4188, and drives it in Chromium, Firefox and WebKit: the Viewer is styled, plays, pauses and seeks, and requests no pro chunk and no Studio CSS; Studio's dock, `.`, `G` and the Guides menu work; in Chromium every form of `linkUrl` is read back from the clipboard. It also measures the weight of `viewer`, `studio` and `stock` (README, "Weight"). 29 checks, all passing on 23 Nov 2026 with Video.js 10.4.0 and with 10.6.0. It needs the network. The port is not 4190: browsers refuse that one (it is on the Fetch standard's list of bad ports).
- `node scripts/contrast.mjs`: 82 rows, two columns (default and `prefers-contrast: more`); every row passes.
- **Browser checks** are in `scripts/browser-checks/`. Each file is the body of an async function with a Playwright `page` in scope; its header names the page, the window sizes and any context options. The runner is not in the repo: serve the production build (`npm run build`, `npx vite preview`, port 4173) or use the live site, and run each script with `playwright-core` in Chromium (the installed Google Chrome, so H.264 plays), Firefox and WebKit. Headless Chrome refuses real fullscreen.

| Script | Checks |
| --- | --- |
| `viewer-gate.js`, `dom-snapshot.js` | The Viewer: tab order, the key map, free pro keys, help dialog, targets, overflow, no pro chunk requested. The snapshot has no verdict: it records the tag, classes and role of every element of the skin in each state (Viewer and Studio), to compare the builds before and after a change |
| `configurator.js` | The landing page: tier and flags, snippet, query round-trip, every "Show me", the event log, the reserved dock height |
| `dock-polish.js` | The link button, `S`, `Shift+G`, the Capture menu, both narrow arrangements, the keybed, the Loop light; knows forced colours |
| `phone-transport.js` | Narrow row one at phone widths; the playhead wins over a handle |
| `range-playback.js` | A set range confines playback |
| `link-open.js` | Frame links open paused on the frame, also when the host autoplays (uses `?media=cosmicDawn`) |
| `embed-link.js` | The embed page in a cross-origin iframe (hard rule 8): playback, fullscreen (stubbed), Copy link copies the embed's own URL, which opens on the same frame; the same copy without `clipboard-write`. Needs `fixtures/` served on a second port (the header has the command) |
| `zoom.js` | Levels, scale, pixelated drawing, guides follow, pan, grab equals grab (add `&media=cosmicDawn`; run at 1x and 2x) |
| `zoom-rendition-cap.js`, `zoom-rendition-note.js` | The cap lift while zoomed; the "showing 720p" note (both with `?cap=1`) |
| `guides-menu-focus.js`, `handle-focus-ring.js`, `fullscreen-focus.js` | Menu opens on "Title safe" in reading order; a handle's ring after pointer and keys; `F` and focus with the Fullscreen API stubbed |
| `error-retry.js`, `two-players.js`, `reduced-motion.js`, `axe-audit.js` | Retry on a broken source; two players share nothing; nothing moves under reduced motion; axe with zero violations in seven states |

**Known failures and flaky checks**
- `configurator.js` in WebKit: `clickFocuses` fails (WebKit does not focus a button on click), and `copied` fails unless the context is given `clipboard-read` (it passed with it on 23 Nov). In Chromium the runner must grant clipboard permission.
- `zoom-rendition-note.js` passes in all three engines since the note follows `videoHeight` (23 Nov). Before that `bestOk` failed in Firefox, and from 19 Nov in Chromium: Video.js keeps reporting the previous rendition after a manual switch.
- `dock-polish.js` in forced colours passes since W.6; under load `keys` (announcements read 150 ms after the key) has failed and passed alone.
- `phone-transport.js` touch runs fail in Firefox and WebKit: the touch drag uses a CDP call that only Chromium has.
- `range-playback.js` is intermittent: after the start at In, hls.js's stall recovery sometimes skips forward inside the range. The engine is right and was left alone.
- `zoom.js` in WebKit: `grabSame` sometimes differs by a few pixel values (at 2x, and on 23 Nov at 1x too). `link-open.js` in WebKit: a seek on load sometimes never lands (1 of 10 on an unchanged player).
- `embed-link.js`: no engine refused the copy without `clipboard-write`. Chromium's async clipboard refuses (`NotAllowedError`) and the skin's selection copy (`execCommand`) still copies, read back from the clipboard; Playwright's Firefox and WebKit take the async write either way. So the announced failure in an iframe was not seen in any engine.
- An axe run has no `pass` field: read `counts` (zero in every state on 23 Nov, three engines). `guides-menu-focus.js` has none either: read `first` and `back`.
- The landing hero is staged: `configurator.js` expects the staged range and guides, and screenshots of it show that state, not an empty player.

## Bundle sizes

Measured on 23 Nov 2026 from the build of `release-readiness` (Video.js 10.6.0, no `cn`; raw / `gzip -9`, bytes).

| Chunk | Size | Loaded |
| --- | --- | --- |
| Viewer path JS (`demo-video-*.js`: Video.js with its streaming engine, the Viewer skin, the flag resolver), then React DOM (`client-*.js`) and React (`react-*.js`) | 906,663 / 273,554, then 211,202 / 65,124 and 7,876 / 3,044 | always |
| Skin CSS (`demo-video-*.css`) | 44,297 / 7,557 | always |
| Pro runtime (`runtime-*.js`); debug readout JS / CSS | 13,181 / 5,202; 1,981 / 1,097 and 681 / 353 | any pro feature or `debug`; `debug` |
| Studio JS / CSS (`studio-*`) | 76,704 / 25,891 and 28,449 / 4,975 | any Studio feature |
| Landing page JS / CSS / HTML | 10,239 / 4,532, 32,193 / 6,451, 25,850 / 6,253 | `/` |
| Monitor page JS / CSS | 16,378 / 6,248 and 2,926 / 1,138 | `/preview.html` |
| Embed page JS / CSS | 1,182 / 723 and 378 / 274 | `/embed.html` |

The shared chunk that used to be `engine-*.js` (React DOM with 30 KB of `cn`) is now `client-*.js`, React DOM alone; `cn` is only in the workbench's chunk. The Viewer against the stock Video.js skin, in a host app (`npm run check:consumer`, 23 Nov 2026, Video.js 10.6.0, gzip -9 of everything loaded before the first frame): stock 352,453 B (JS 341,762, CSS 10,691), Frameline Viewer 351,036 B (JS 343,503, CSS 7,533), Studio 387,755 B. The Viewer is 1,417 B lighter than stock, 0.4% (with `cn` it was 14,450 B heavier, 4.1%); with Video.js 10.4.0 the difference is 1,487 B.

## Unverified

**Browsers**
- Safari itself and iOS Safari. Playwright's WebKit (a Safari 27.2 build) stood in. The floor versions (Chrome 111, Firefox 121, Safari 16.4) were never run.
- Native HLS in Safari: the rendition note and the cap lift (Playwright's WebKit played through hls.js).
- Firefox 121 to 126 without `ClipboardItem` (the disabled Copy item), and Firefox before 132 without `requestVideoFrameCallback` (the fallback clock and the `≈` marker, which runs past the narrow field in a wider font).
- The clipboard in Firefox and WebKit: that `S` and `Shift+G` write was read back in Chrome only.
- Windows and Linux: that `Alt+←` goes back in the browser while zoomed. Custom properties inside `::cue` in Safari.
- Why Video.js's `activeVideoRendition` lags a manual quality switch (Firefox since step 9, Chromium since 19 Nov). The note no longer depends on it.
- The media element's Tab stops in a real Firefox, and the focus order with a screen reader after `tabindex="-1"` (Playwright's Firefox: no stop on the media element).
- The help dialog and tooltips on the site root under forced colours (those runs were on the monitor page).

**Devices and assistive tech**
- A screen reader: names, roles and announcements were read from the DOM and the accessibility tree, never heard.
- Real touch devices: touch was emulated everywhere; the touch drag of the playhead and handles is confirmed in Chromium only. `Space` from a tablet keyboard.
- Real fullscreen with the dock, guides and zoom, on a phone on its side, and where focus lands after Escape (the API was stubbed).
- A real pointer and a 1x display: the magnet and the 3 px pan threshold, the press travel, the groove's rim, the link's hover, the landing page's rim and shadow.
- Windows: Segoe UI Variable and the timecode's widths with it (Verdana stood in), and Windows High Contrast itself.
- The social card in real link previews.
- The npm package in hosts other than Vite 8 + React 19 (webpack, Next.js with `'use client'`, Parcel, esbuild), a CSS pipeline that rejects CSS from `node_modules`, `npm publish` itself and an install from the registry rather than a tarball.

**Playback**
- Frame numbers against the reel's burned-in timecode agree where looked at, except one missing frame at the 10 s segment join; the other joins were not checked one by one.
- Drop-frame and a start timecode with hours in the browser (unit tests only). A real one-hour file.
- A 9:16 or 1:1 source, a video smaller than the stage, and `object-fit` values other than `contain` and `cover`.
- A rendition switch arriving mid-zoom, the cap lift on a slow connection or after the host replaces `source`, and whether 100% is drawn without resampling.
- Captions from a real stream on the default demo (the reel has none), and captions while zoomed.
- Retry on a source that recovers. Autoplay with sound outside Chrome. A slow or stalled network.
- Why `video.duration` shrinks from 56.083 s to 56.044 s once the reel has played.
- `apiRef` with a host that re-creates the ref, and its calls before metadata.

**Links and embeds**
- Other tools reading our `t=` seconds: from the specs, not tried.
- The embed in a cross-origin iframe is checked by `embed-link.js` on a local build (two local origins, over http). The real page, https://artmarchuk.me/videojs-frameline-skin.html, was checked against production on 23 Nov 2026 after API 0.1 step A (Chromium, scripted): it plays, four frame steps reach 00:00:21:04, Copy link copies the embed's URL with `#t=21.188&tc=00:00:21:04`, and that link opens paused on the frame. Not checked: real fullscreen inside an iframe (the API is stubbed), Copy frame image inside an iframe, and Copy link in an iframe without `clipboard-write` in Safari and in a real Firefox.
- `linkUrl` in the browser: the string and function forms are covered by unit tests of `resolveLinkUrl` only; no page of the site passes one, so the `null` path (no check, no announcement) was not seen on screen.
- The debug readout's "—" for a missing API: every engine tested has both APIs, so the dash was seen only while paused (measured fps before the first samples).
- Preview URLs were never opened in a browser (Vercel login); checks ran on the local build of the same commit.

**Layout and data**
- The platform zone numbers come from secondary sources, and the EBU and ITU documents behind the safe areas were not opened ("Platform zones: numbers and sources").
- Seen, not fixed: on `/preview.html?debug` the skin re-renders on every frame, because the page's event log stores each `onFrameChange` in the state of the component that renders the skin (the same on the live site; on `/?debug` the count stays at 3).
- Seen, not fixed: the open Guides menu is cut at its bottom edge on a 760 px and a 390 px player with nothing to show that it scrolls; the Markers menu cuts long names and times on a narrow player.
- A wide tablet in the narrow arrangement; the landing page at 320 px and in the tablet range; a host with `timecode: false` or `loop: false` on the 500 px dock.
- The landing page's line "zero violations in six states" was not re-counted (the audit now runs seven states).
- Menu type-ahead and `Home`/`End` in a menu; the light's fade in motion.

## Log

| Date | Step or branch | In `main` at |
| --- | --- | --- |
| 15 Nov 2026 | Step 1: scaffold with the Video.js CLI, first deploy | `2e28c74` |
| 15 Nov | Step 2: skin foundation and the Viewer tier | `1519695` |
| 15 Nov | Step 3: pro core (flags, store, frame clock, timecode) | `6819c67` |
| 15 Nov | Step 4: Studio transport | `d00f0e9` |
| 15 Nov | Step 5: ruler timeline; step 5b: dock layout | `5705b5d`, `f3454f8` |
| 15 Nov | Step 6a: Viewer and Studio rework; 6b: guides; 6c and 6d: fixes | `60c2910`, `7c1b939`, `9a22494`, `14a7376` |
| 15 Nov | Step 7: zoom; 7b: Guides menu and Zoom button | `b9d8c08`, `80a2db7` |
| 15 Nov | Step 8: rename to Frameline, demo media in one place, the configurator page, README, FEATURES | `c8efa03` |
| 16 Nov | Step 9: hardening (axe, three engines, more contrast, forced colours, reduced motion) | `b6594e8` |
| 16 Nov | A set range confines playback | `0b47713` |
| 16 Nov | Dock polish, its follow-up and last fixes (branch `dock-polish`) | `7f712cb`, `778a385`, `48339a6` |
| 17 Nov | Landing page redesign from Figma; the reel as demo (branch `landing-redesign`) | `e509fbd`, `7774e1f` |
| 17 Nov | Embed page | `9543dc5`, `f631e69` |
| 17 Nov | Submitted to the Video.js Skins Design Challenge | |
| 17 Nov | Phone fixes; narrow dock rows (branch `mobile-dock-rows`) | `3143ac3`, `261bae0` |
| 17 Nov | Icon trial, three rounds (branch `icons-phosphor-trial`), with the tooltip fix | `f42957d` |
| 18 Nov | Theme A, A.1, A.2 (branch `theme-industrial`) | `03712d4` |
| 18 Nov | Landing visuals, rounds one to five (branch `landing-visuals`) | merge `ab5371f` |
| 18 Nov | Theme B and B.8 (branch `theme-b`) | `1fe3967` |
| 18 Nov | Theme C and C.6 (branch `theme-c`); the deploy guard | merge `d94354c` |
| 19 Nov | Theme wrap-up (branch `theme-wrap`) | `ec5fddb` |
| 19 Nov | Landing copy and the static social card (branch `landing-visuals`) | merge `8b96a69` |
| 19 Nov | The backlog moves out of the repo | `208f42b` |
| 19 Nov | Landing: the motivation section (branch `landing-motivation`) | `eed08bf` |
| 22 Nov | Frame links in seconds with a timecode (branch `frame-links`) | `5c30238` |
| 22 Nov | Frame links pause an autoplaying host (branch `frame-links-pause`) | `24e44ae` |
| 22 Nov | Landing: the frame-link sentence (branch `landing-frame-links-copy`) | `f74fe1f` |
| 22 Nov | Docs and repo clean-up: this file split from the build log, finished specs archived (branch `docs-cleanup`) | `44912f1` |
| 23 Nov | Source comments point at the build log; the Viewer bar's row in `FEATURES.md` matches the code (branch `comment-fixes`; the rest of the docs follow-up is on `api-names`) | `35e5e13` |
| 23 Nov | API 0.1, step A: names, `linkUrl`, the public surface, playback stats, two fixes (branch `api-names`) | `8e901c6` |
| 23 Nov | API 0.1, step B: the library build, `videojs-frameline` 0.1.0 (not published), exact pins, the consumer check, the Viewer weighed against the stock skin (branch `package`) | `24fe256` |
| 23 Nov | 0.1.0 readiness: Video.js 10.6.0 (peers `>=10.4.0 <10.7.0`), no `cn`, the markup snapshot, the missing `scripts/lib/clean-types.mjs` committed (branch `release-readiness`). `engines` removed; Vercel builds on its 26.x setting | `fad54d2` |
| 23 Nov | Node.js 26 in `.nvmrc` for contributors and a future CI; the README's Node.js line (branch `node-version`) | `LOGHASH` |
