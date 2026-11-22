# NOTES

## About this file

This is the current state of the project, kept short (250 lines at most). A session updates the section its change affects, replaces any line its change makes untrue, and adds one line to the Log. Reports and step detail stay out. The full build log from step 1 to frame links (15–22 Nov 2026) is in [`docs/history/NOTES-2026-11.md`](docs/history/NOTES-2026-11.md); section names in quotes below are sections of that file.

Names: the skin is **Frameline** (`FramelineSkin`, `--fl-*` tokens, storage key `frameline:v1`). Internal names still say "pro": `src/pro/`, the `.pro-*` classes, `data-pro-*`, `ProStore`, and the Vercel project `videojs-pro`. The model file `src/pro/view.ts` holds the Guides state.

## Versions

| What | Version |
| --- | --- |
| Node.js | 26.3.0 on the author's machine; `engines.node` is `24.x` because Vercel rejected 26 |
| npm | 11.16.0, `package-lock.json` committed |
| `@videojs/react`, `@videojs/core`, `@videojs/utils` (dependencies), `@videojs/mux-video` (devDependency) | 10.4.0, pinned exactly; the transitive `@videojs/*` packages and the `video.js` v10 pointer package are 10.4.0 too. hls.js arrives through them at 1.7.3 |
| React, React DOM | 19.3.1 (`^19.3.0`) |
| Vite, TypeScript, Vitest | 8.3.8, 7.0.2, 5.1.0 (Vitest pinned) |
| `playwright-core`, `@axe-core/playwright` | 1.65.1, 4.14.0 (the browser checks) |
| `sharp`, `@phosphor-icons/core` | 0.35.5, 2.1.1, both pinned; sharp makes the landing screenshots, Phosphor is only read (path data is copied into the source) |
| Deploy CLIs | `vercel@64`, `netlify-cli@27`, `wrangler@4`, through `npx` in the package scripts |

Only `@videojs/*` and the three pinned tools above have exact versions; the rest keep caret ranges, locked by the lockfile. Tailwind, Base UI and Heroicons are devDependencies of the CLI's workbench shell only; the skin is plain CSS.

## URLs and deploys

- **Canonical:** https://frameline.artmarchuk.me, a custom domain on the Vercel project `videojs-pro`. `videojs-frameline.vercel.app` redirects to it. Repo: https://github.com/artmarchuk/videojs-frameline.
- **`/`** the landing page with the configurator: `?tier=viewer|studio` always, `?layout=` and one parameter per flag (`zoom=0`, `timecode=1`) where they differ from the tier; `media`, `debug` and a frame link in the hash survive.
- **`/preview.html`** the monitor page, opens in Studio: `?tier=viewer`, `?density=compact`, `?layout=dock|overlay`, `?guides=title-safe,9:16` (or `0`), `?zones=0`, `?zoom=0`, `?cap=1` (puts the rendition cap back), `?media=cosmicDawn|plain|nocors|error`, `?debug`; in the hash `#width=`, `ratio=`, `autoplay=1&muted=1`.
- **`/embed.html`** the player alone, for an iframe: `?src=` (or `?mux=<playback ID>`), `tier`, `fps`, `poster`. The README has the table and the iframe snippet.
- **`/workbench.html`** the CLI's workbench; **`/two-players.html`** two players on one page, for its check.
- **Previews** are behind the Vercel login (Deployment Protection is on for previews only), so a preview URL answers with a redirect; production answers 200 with no login.
- **Deploying:** the rules are in `CLAUDE.md`, "Branches and deploys". `npm run deploy vercel` runs `apps/preview/deploy-guard.mjs` first, which refuses anything but a clean checkout of `origin/main`; a branch gets `npm run preview:vercel`.
- `og.png` is a static file the author maintains by hand (`design/og.png` copied to `apps/preview/public/og.png`); no script writes it.

## Architecture

- **Loading.** `src/video/skin.tsx` is the Viewer skin and the only code a Viewer loads. `src/pro/frameline-skin.tsx` resolves the tier and flags (`features.ts`) and, when any pro feature or `debug` is on, lazy-loads the pro runtime (`src/pro/runtime/`: store, frame clock, timecode) and then the Studio module (`src/pro/studio/`, one JS and one CSS chunk). The Viewer skin renders empty slots in its bar (`src/video/pro-slots.tsx`) and the Studio module portals its controls into them, so they sit in the bar's layout and focus order while their code stays out of the Viewer path. The dock structure itself (stage above, bar below) is in the Viewer skin, so either tier can use either layout.
- **Pro state** lives in a small store beside the player (`src/pro/store.ts`), one per `FramelineSkin`, read through context and `useSyncExternalStore` selectors. Video.js has no documented custom-feature API and the skin does not own `createPlayer`. The `<video>` element is found by querying the container (`use-video-element.ts`). Guides, crop, zones and the timecode-or-seconds choice persist under one `localStorage` key, read in the store's initialiser; zoom is never stored.
- **Frame clock** (`src/pro/frame-clock.ts`): `requestVideoFrameCallback` where the browser has it, otherwise an approximate fallback from `currentTime` (the field then shows `≈`). After a seek or pause it waits 120 ms for a presented frame, then falls back. Chrome's `mediaTime` is the frame's start; Firefox reports the seek time, so `presentedFrame` in `timecode.ts` floors with a quarter-frame tolerance. Seeks go to the middle of a frame, `(frame + 0.5) / fps`, and a `seeking` listener snaps every Studio seek there. The skin does not re-render per frame: only the timecode field subscribes to the frame.
- **Range engine** (`src/pro/studio/controller.ts`, decision in `playbackDecision`, `studio/logic.ts`): a set range confines playback. Play from outside the range or from the Out frame starts at In; at Out it returns to In, or pauses with Loop off; a user or host seek to outside the range while playing pauses there. The engine tells its own seeks from everyone else's with two flags around `seeking`/`seeked`, so a user seek is never pulled back. Out is reached half a frame early; the Out frame shows for an instant at the loop point.
- **Frame links** (`studio/logic.ts`: `formatLinkPosition`, `readLinkPosition`, `resolveLinkPosition`): a copied link is `#t=<seconds>&tc=<timecode>`, `t` the middle of the frame. Reading takes `tc`, then `t` as an old four-field timecode, as Media Fragments seconds, or as platform shorthand (`1m2s`); the first value inside the media wins. Applying a link pauses and holds the frame for 500 ms after the seek lands, so an autoplaying host stays paused; a play within a second of a trusted press is never paused. Video.js does not read the page URL at all. The Viewer does not read links.
- **Guides** (`src/pro/studio/guides/`): `pictureRect` in `geometry.ts` computes the picture inside the stage for the video's `object-fit`; `usePictureRect` measures the video element, publishes `--fl-picture-x/y/w/h`, and re-measures on resize, metadata, a new source and fullscreen. Each guide is one SVG the size of the picture; every line is drawn twice (dark edge, white line). Zone numbers are in `platform-zones.ts`, the only file to edit for them.
- **Zoom** (`src/pro/zoom.ts`, `studio/zoom.tsx`): the media, poster and overlay sit in one `div.pro-picture` that takes a `translate() scale()`; the element exists only with the `zoom` flag. 100% is one pixel of the best rendition on offer (`sourceWidth`) per device pixel, so the scale does not change with the playing rendition. Guides scale with the wrapper and divide their strokes by `--fl-zoom-scale`. `useLiftRenditionCap` sets `capRenditionToPlayerSize: false` on the source while zoomed on Auto and puts the host's source back at Fit; it never selects a rendition, so a frame already buffered stays in its rendition.
- **Dock arrangement** (`useDockArrangement`, thresholds in `studio/logic.ts`): wide from a 740 px player with a mouse; narrow below it and always on touch, as `keys` (500 px and up) or `compact`. It is set in script because the DOM order changes with it and the focus order has to follow; everything else is container queries.
- **Site** (`apps/preview/`): `src/frame/media.ts` is the one place that names the demo media (active: `reel`, 56 s, 24 fps, 1920×1072 picture in a 1080 file, no captions; `cosmicDawn` has captions, chapters and 4K). The landing page stages its opening state through `apiRef`, reserves the dock's height before the Studio code arrives, and keeps its global CSS out of the player with `:not(:where(.media-skin *))`.

## Video.js APIs we rely on

Checked against the installed `@videojs/react`, `@videojs/core` and `@videojs/hlsjs-video` 10.4.0 (bundled docs and `dist/` source). Details are in the archive's "Verified APIs" sections.

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
- `capRenditionToPlayerSize: false` on every demo source; `?cap=1` restores the cap for the checks that need it.
- The landing page's screenshots come from `scripts/landing-shots.mjs`; after a theme change reaches `main` they are stale until re-shot.
- Credit: the footer reads "Made by Artem Marchuk, with Claude."; the README credits Claude for design thinking, specs and code, with every decision and review Artem's.

## Checks

- `npm run typecheck`, `npm test` (233 unit tests), `npm run build`.
- `node scripts/contrast.mjs`: 82 rows, two columns (default and `prefers-contrast: more`); every row passes.
- **Browser checks** are in `scripts/browser-checks/`. Each file is the body of an async function with a Playwright `page` in scope; its header names the page, the window sizes and any context options. The runner is not in the repo: serve the production build (`npm run build`, `npx vite preview`, port 4173) or use the live site, and run each script with `playwright-core` in Chromium (the installed Google Chrome, so H.264 plays), Firefox and WebKit. Headless Chrome refuses real fullscreen.

| Script | Checks |
| --- | --- |
| `viewer-gate.js` | The Viewer: tab order, the key map, free pro keys, help dialog, targets, overflow, no pro chunk requested |
| `configurator.js` | The landing page: tier and flags, snippet, query round-trip, every "Show me", the event log, the reserved dock height |
| `dock-polish.js` | The link button, `S`, `Shift+G`, the Capture menu, both narrow arrangements, the keybed, the Loop light; knows forced colours |
| `phone-transport.js` | Narrow row one at phone widths; the playhead wins over a handle |
| `range-playback.js` | A set range confines playback |
| `link-open.js` | Frame links open paused on the frame, also when the host autoplays (uses `?media=cosmicDawn`) |
| `zoom.js` | Levels, scale, pixelated drawing, guides follow, pan, grab equals grab (add `&media=cosmicDawn`; run at 1x and 2x) |
| `zoom-rendition-cap.js`, `zoom-rendition-note.js` | The cap lift while zoomed; the "showing 720p" note (both with `?cap=1`) |
| `guides-menu-focus.js`, `handle-focus-ring.js`, `fullscreen-focus.js` | Menu opens on "Title safe" in reading order; a handle's ring after pointer and keys; `F` and focus with the Fullscreen API stubbed |
| `error-retry.js`, `two-players.js`, `reduced-motion.js`, `axe-audit.js` | Retry on a broken source; two players share nothing; nothing moves under reduced motion; axe with zero violations in seven states |

**Known failures and flaky checks**
- `configurator.js` in WebKit: `copied` fails (headless WebKit refuses clipboard writes) and `clickFocuses` fails (WebKit does not focus a button on click). In Chromium the runner must grant clipboard permission.
- `zoom-rendition-note.js`: `bestOk` fails in Firefox, and since 19 Nov in Chromium too, also against the live site: Video.js keeps reporting the previous rendition after a manual switch.
- `dock-polish.js` in forced colours passes since W.6; under load `keys` (announcements read 150 ms after the key) has failed and passed alone.
- `phone-transport.js` touch runs fail in Firefox and WebKit: the touch drag uses a CDP call that only Chromium has.
- `range-playback.js` is intermittent: after the start at In, hls.js's stall recovery sometimes skips forward inside the range. The engine is right and was left alone.
- `zoom.js` at 2x in WebKit: `grabSame` sometimes differs by a few pixel values. `link-open.js` in WebKit: a seek on load sometimes never lands (1 of 10 on an unchanged player).
- The landing hero is staged: `configurator.js` expects the staged range and guides, and screenshots of it show that state, not an empty player.

## Bundle sizes

Measured on 22 Nov 2026 from the build of `main` at `f74fe1f` (raw / `gzip -9`, bytes).

| Chunk | Size | Loaded |
| --- | --- | --- |
| Viewer path JS (`demo-video-*.js`: React, Video.js with its streaming engine, the Viewer skin, the flag resolver) | 958,089 / 282,039 | always |
| Skin CSS (`demo-video-*.css`) | 44,297 / 7,554 | always |
| Pro runtime (`runtime-*.js`) | 12,788 / 5,046 | any pro feature or `debug` |
| Studio JS / CSS (`studio-*`) | 75,359 / 25,460 and 28,449 / 4,975 | any Studio feature |
| Debug readout JS / CSS | 1,388 / 806 and 680 / 353 | `debug` |
| Landing page JS / CSS / HTML | 10,134 / 4,488, 32,193 / 6,451, 25,869 / 6,270 | `/` |
| Monitor page JS / CSS | 16,390 / 6,245 and 2,926 / 1,138 | `/preview.html` |
| Embed page JS / CSS | 1,187 / 724 and 378 / 274 | `/embed.html` |

Every page also loads a shared `engine-*.js` (225,136 / 70,813) that was not broken down. The Viewer skin's weight alone, against a stock Video.js skin, has not been measured.

## Unverified

**Browsers**
- Safari itself and iOS Safari. Playwright's WebKit (a Safari 27.2 build) stood in. The floor versions (Chrome 111, Firefox 121, Safari 16.4) were never run.
- Native HLS in Safari: the rendition note and the cap lift (Playwright's WebKit played through hls.js).
- Firefox 121 to 126 without `ClipboardItem` (the disabled Copy item), and Firefox before 132 without `requestVideoFrameCallback` (the fallback clock and the `≈` marker, which runs past the narrow field in a wider font).
- The clipboard in Firefox and WebKit: that `S` and `Shift+G` write was read back in Chrome only.
- Windows and Linux: that `Alt+←` goes back in the browser while zoomed. Custom properties inside `::cue` in Safari.
- Why the rendition note lags a manual quality switch (Firefox since step 9, Chromium since 19 Nov).
- The help dialog and tooltips on the site root under forced colours (those runs were on the monitor page).

**Devices and assistive tech**
- A screen reader: names, roles and announcements were read from the DOM and the accessibility tree, never heard.
- Real touch devices: touch was emulated everywhere; the touch drag of the playhead and handles is confirmed in Chromium only. `Space` from a tablet keyboard.
- Real fullscreen with the dock, guides and zoom, on a phone on its side, and where focus lands after Escape (the API was stubbed).
- A real pointer and a 1x display: the magnet and the 3 px pan threshold, the press travel, the groove's rim, the link's hover, the landing page's rim and shadow.
- Windows: Segoe UI Variable and the timecode's widths with it (Verdana stood in), and Windows High Contrast itself.
- The social card in real link previews.

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
- The embed page has no section in the build log: its behaviour inside a cross-origin iframe (playback, fullscreen, Copy link) has no recorded check, and that artmarchuk.me embeds it comes from the author, not from the repo.
- Preview URLs were never opened in a browser (Vercel login); checks ran on the local build of the same commit.

**Layout and data**
- The platform zone numbers come from secondary sources, and the EBU and ITU documents behind the safe areas were not opened ("Platform zones: numbers and sources").
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
| 23 Nov | Source comments point at the build log; the Viewer bar's row in `FEATURES.md` matches the code (branch `comment-fixes`) | |
