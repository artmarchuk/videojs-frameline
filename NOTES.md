# NOTES

Read this at the start of every step, along with `specs/PROJECT-OVERVIEW.md` and the step's requirements file.

## Versions (step 1, 15 Nov 2026)

| What | Version |
| --- | --- |
| Node.js | 26.3.0 (Vite 8 needs `^20.19.0 \|\| >=22.12.0`) |
| Package manager | npm 11.16.0, lockfile `package-lock.json` committed |
| `@videojs/cli` (used via `npx @videojs/cli@10.4.0`) | 10.4.0 |
| `@videojs/react` | 10.4.0 (pinned, dependency) |
| `@videojs/core` | 10.4.0 (pinned, dependency) |
| `@videojs/mux-video` | 10.4.0 (pinned, devDependency, used by the workbench) |
| Transitive `@videojs/*` | `media`, `store`, `utils`, `spf`, `hlsjs-video`, `native-hls-video`, all 10.4.0 |
| `video.js` (transitive, from `@videojs/core`) | 10.4.0: the v10 pointer package that throws coded errors for v8 patterns. **Not v8.** |
| `@videojs/html` | not installed (React skin); npm latest is 10.4.0 |
| Video.js skill (Claude Code plugin `videojs@videojs`) | 0.4.0, user scope, enabled; skills `videojs:videojs`, `videojs:videojs-skin`, `videojs:videojs-ui` |
| Vitest (devDependency, pinned) | 5.1.0 |
| Vercel CLI | the deploy script runs `vercel@64`; the latest is 65.16.0 |

Docs versus installed version: npm `latest` is 10.4.0, and the bundled docs (`node_modules/@videojs/react/docs/llms.txt`) say "Bundled with `@videojs/react` v10.4.0". The `next` tag is an old `10.0.0-rc.5`. The live docs site does not print a version, so a mismatch there can't be ruled out (see Unverified).

## Step 2: Skin foundation and Share tier (15 Nov 2026)

### What the scaffold already gave us

Container, poster, error dialog, controls with auto-hide, time slider with chapters and thumbnail preview, volume popover, captions button, settings menu (quality, audio, speed, captions), PiP, fullscreen, AirPlay and Cast buttons, hotkeys, gestures, status announcer, and volume, status and seek indicators. We kept the components and their wiring and rewrote the layout, every style and every icon.

### Verified APIs (against `@videojs/react` 10.4.0 docs and types)

- `Container` (sets `data-controls-visible`; we add `data-theme="pro"`, `data-preset="video"`, `data-tier`, `data-density`).
- `Controls.Root`, `Controls.Content` (`data-visible`, `data-started`, `data-user-active`), `Controls.Group`. Auto-hide delay is fixed; controls stay visible while paused.
- `TimeSlider.Root / Chapters (renderChapter) / Track / Buffer / Fill / Thumb / Preview / Value type="pointer" / ChapterTitle`; `Slider.Thumbnail.Root / Image`. CSS variables `--media-slider-fill`, `--media-slider-pointer`, `--media-slider-buffer`, `--media-slider-chapter-start/end`. Data attributes `data-dragging`, `data-pointing`, `data-interactive`, `data-disabled`.
- `VolumeSlider.Root (orientation) / Track / Fill / Thumb`; returns nothing when volume cannot be set (iOS). `MuteButton` (`data-muted`, `data-volume-level`).
- `Time.Value (type, toggle)`, `Time.Group`, `Time.Separator` (`data-type`, `data-unavailable`, `data-disabled`).
- `PlayButton` (`data-paused`, `data-ended`, `data-started`), `CaptionsButton` (`data-active`; hidden with no tracks), `PiPButton` (`data-pip`; renders nothing when unsupported), `FullscreenButton` (`data-fullscreen`).
- `Menu.Root / Trigger / Popup / Content / Item (onSelect) / RadioItem / ItemIndicator / Separator`; `PlaybackRateRadioGroup`, `QualityRadioGroup`, `CaptionsRadioGroup`, `AudioTrackRadioGroup` from `@videojs/react/ui/*`. Variables `--media-menu-width/height/available-width/available-height`.
- `Tooltip.Provider / Root (side, align, boundary) / Trigger / Popup / Label / Shortcut`. Opens on hover and focus.
- `Dialog.Root (open, onOpenChange) / Backdrop / Popup / Title / Close`; `ErrorDialog.Root / Backdrop / Popup / Title / Description / Close`.
- `Hotkey (keys, action, value)` and `useHotkey({ keys, onActivate, action, repeatable })` for custom shortcuts.
- `Gesture (type, action, pointer, region, value)`.
- `StatusAnnouncer`, `StatusIndicator`, `VolumeIndicator`, `SeekIndicator`, `BufferingIndicator` (`data-visible`), `Poster`.
- `usePlayer(selectError)`, `usePlayer(selectPiP)`, `useMedia()`.
- Public tokens: `--media-accent-color`, `--media-accent-text-color`, `--media-border-color`, `--media-border-radius`, `--media-font-family`, `--media-object-fit`, `--media-object-position`, `--media-scale-unit`, plus `--media-controls-before-start`.

### Names that differ from the step 2 brief

- There is no `Popover` around the settings menu: `Menu.Popup` is the popup. `Popover` exists but is not needed.
- Hotkey custom mechanism is the `useHotkey` hook, not a prop on `Hotkey`.
- `Hotkey` has no "seek 5 s" default: the default step is 10 s, so `←` / `→` pass `value={±5}`.
- The scaffold bound `I` to picture-in-picture; removed, because the Review tier needs `I`.
- `--media-border-radius` is the player's corner radius (docs), and `--media-border-color` is the hairline around the player. We map them to `--pro-radius` and `--pro-frame-line`.
- Extra tokens beyond the brief: `--pro-track` (slider track, added to reach 3:1), `--pro-scrim-alpha` and `--pro-scrim`, `--pro-frame-line`, `--pro-density-control/gap/pad`, `--pro-control-size`, `--pro-slider-hit`, focus and layer tokens.

### Contrast (computed by `node scripts/contrast.mjs`)

| Pair | Ratio | Minimum | Result |
| --- | --- | --- | --- |
| text on surface-0 | 16.83:1 | 4.5 | PASS |
| text on surface-1 | 15.74:1 | 4.5 | PASS |
| text on surface-2 | 14.38:1 | 4.5 | PASS |
| text-dim on surface-1 | 7.03:1 | 4.5 | PASS |
| text-dim on surface-2 | 6.42:1 | 4.5 | PASS |
| text on scrim (0.88) over white frame | 12.50:1 | 4.5 | PASS |
| text-dim on scrim (0.88) over white frame | 5.58:1 | 4.5 | PASS |
| accent on scrim (0.88) over white frame | 12.30:1 | 3 | PASS |
| accent (focus ring, fill, thumb) on surface-0 | 16.56:1 | 3 | PASS |
| accent on surface-1 | 15.48:1 | 3 | PASS |
| accent on surface-2 | 14.14:1 | 3 | PASS |
| accent-ink on accent | 16.56:1 | 4.5 | PASS |
| slider track (--pro-track) on surface-0 | 5.04:1 | 3 | PASS |
| slider track (--pro-track) on scrim over white | 3.74:1 | 3 | PASS |
| hairline (line) on surface-1, decorative | 1.34:1 | - | PASS |
| focus ring halo: accent vs surface-0 halo | 16.56:1 | 3 | PASS |
| focus ring halo: surface-0 halo vs white frame | 19.57:1 | 3 | PASS |

The scrim is `--pro-surface-0` at 88% opacity. Text and icons sit only over the full-strength part of the scrim, so the "over white frame" rows are the worst case. Proposed token values were kept; only `--pro-track` (#7A828E) was added (the unfilled track; the buffered range uses `--pro-text-dim`), because the hairline colour is too dark for a slider track (first try #5C6470 gave 2.43:1 over white).

### Gate checklist (public URL, Chrome on macOS, 15 Nov 2026)

| Item | Result |
| --- | --- |
| Play, pause | Pass (button, click on video, `Space`, `K`) |
| Seek by mouse | Pass (click on the bar) |
| Seek by keyboard | Pass (`←` `→` 5 s, `J` `L` 10 s, `0`–`9`, `Home`, `End`) |
| Seek by touch | **Not tested** (no touch device or emulation in this session) |
| Time display | Pass (elapsed and total; total toggles to remaining) |
| Volume, mute | Pass (`M`, `↑` `↓`, slider present) |
| Fullscreen | **Not verified after the reskin.** In this browser session Chrome refused fullscreen for any element, including `document.documentElement` ("not granted"), so it is the session, not the skin. It worked in step 1 with the same `FullscreenButton`, which is unchanged. The author should press `F` once |
| Keyboard only | Pass. Tab order: player, Play, Mute, Volume, Seek, Time, Captions, Settings, PiP, Fullscreen, then out. No trap. `Shift+?` opens help, `Esc` closes, focus returns |
| Free keys | Pass: `I`, `O`, `,`, `.`, `Shift+←/→` do nothing |
| Phone viewport | Layout only: 320 px and 360 px wide players checked in the workbench. **44 px targets, tap and double-tap not tested**: the session could not emulate a coarse pointer or resize the window. Needs a real phone |
| Narrow embed, 320 px | Pass: nothing overflows; settings menu and help dialog stay inside and scroll |
| Bright and dark frame | Pass: checked with the video forced to pure white; controls, time and focus rings legible |
| Reduced motion | **Not tested in a browser.** By construction every transition uses `--pro-duration` or `--pro-duration-fade`, both set to 0 ms, and the spinner animation is removed |
| Captions | Pass: button and `C` toggle; track menu lists English and Japanese; cue styled with `::cue` |
| Error dialog | Pass: appears on a bad source (`/preview.html?media=error`). Retry closes it and reloads the source (new network requests seen). See Unverified for the still-broken-source case |
| Source without captions | Pass (`?media=plain`): captions button hidden |
| RTL | Pass (workbench, Arabic): transport order and seek bar not mirrored; menu and chevrons mirrored |
| 9:16 | Player box only (workbench ratio); we have no 9:16 source yet |
| Screen reader | **Not tested** (no VoiceOver pass). Accessible names verified in the accessibility tree |
| Browsers | Chrome only. **Firefox and Safari not tested** |

## Step 3: Pro core (15 Nov 2026)

### Verified APIs

- `createPlayer({ features })` builds the store; `VideoPlayer` from `@videojs/react/video` is the preset player. The host creates the player, not the skin.
- `usePlayer(selector)` and `usePlayer()` (store access); `useMedia()` returns a media handle that only guarantees `play()` and the event methods. It is not always the `<video>` element.
- `@videojs/core` exports `definePlayerFeature`, but its features are marked `@internal` in the source and no React doc page describes writing a custom feature. Docs only describe combining the shipped features.
- `HTMLVideoElement.requestVideoFrameCallback` and `getVideoPlaybackQuality()` are browser APIs, typed in the DOM lib.

### Where pro state lives, and why

A small separate store next to the player (`src/pro/store.ts`), created once per `ProSkin`, read through a React context and `useSyncExternalStore` with selectors. Reasons: Video.js has no documented custom-feature API; the skin does not own `createPlayer`, so it could not add a feature even if there were one; and a separate store keeps every pro byte out of the Share path.

The `<video>` element is found by querying the player container (`useVideoElement`), re-run when `useMedia()` changes and when the container's children change.

### Decisions

- **In past out:** the points are swapped, so the mark the user just made is kept. Setting a point exactly onto the other is rejected.
- **Fractional rates:** `fps` is a plain number. 23.976, 29.97 and 59.94 are recognised by value (within 0.01), so `29.97` and `30000 / 1001` both resolve to the exact rational. Seconds-to-frames uses the exact rate; timecode digits use the nominal count (24, 30, 60).
- **Rounding:** `framesFromSeconds` floors after adding 0.01 frame, so `25 / 24` s is frame 25 and not 24. For `requestVideoFrameCallback` media times (frame start times) the clock uses the nearest frame, as the brief asks.
- **Bad input:** an invalid `fps` falls back to 24; negative or non-finite frame numbers clamp to 0; `parseTimecode` returns `null`. Drop-frame text that names a skipped frame number (`00:01:00;00`) is `null`.
- **Guide attributes:** `9:16` becomes `data-guide-9-16`, `2.39` becomes `data-guide-2-39`, because `:` and `.` are awkward in CSS selectors.
- **Slots:** `toolbarStart` sits after play and volume; `toolbarEnd` sits before captions; `overlay` goes inside the `aria-hidden` overlay layer.
- **After a seek or pause** the clock waits 120 ms for a presented frame, then falls back to `currentTime`, so the reading is never stale.
- `debug` is a feature flag that `?debug` or the `debug` prop switches on; that alone loads the pro runtime, in any tier.
- The demo stream is 30 fps, not 24: the clock reported media times in steps of 1/30 s. `media.ts` now passes `fps: 30`. Our own video (step 8) is 24 fps.

### Differences from the brief

- `features` accepts `guides: true` (all guides) as well as `false` or a list.
- The store also holds `duration`, `clockSource` and `clockPrecision`, and has `selectMarker`, `setFrame`, `setClock`, `setDuration`, `setAllowedOverlays` and `setCallbacks` besides the listed actions.
- `useFrameClock(videoEl, fps)` writes to the store and returns nothing; `source` and `precision` are read from the store.
- `startTimecode`, `dropFrame` and `markers` are accepted but not used yet (no timecode display or timeline until steps 4 and 5). The debug readout shows a timecode with the `startTimecode` offset.
- `nearestFrame` was added next to `framesFromSeconds`.

### Chunk sizes (production build, gzip)

| Chunk | Raw | Gzip | Loaded when |
| --- | --- | --- | --- |
| `preview-*.js` (Share path: React, Video.js with the Mux/HLS engine, the Share skin, `ProSkin` wrapper and flag resolver) | 963.0 kB | 284.1 kB | always |
| `preview-*.css` (skin styles; byte-identical to the step 2 tag) | 30.7 kB | 5.6 kB | always |
| `runtime-*.js` (store, frame clock, timecode) | 7.7 kB | 3.3 kB | any pro feature or debug is on |
| `review-*.js`, `studio-*.js` (empty until steps 4 to 7) | 47 B each | 86 B each | a feature of that tier is on |
| `debug-*.js` + `debug-*.css` | 1.3 kB + 0.7 kB | 0.8 kB + 0.4 kB | `debug` or `?debug` |
| `dev-tier-switch-*.js` (preview app only) | 0.4 kB | 0.3 kB | `?debug` |

Checked on the public URL without `?debug`: no pro chunk is requested. The Share chunk contains none of the store, clock, timecode or debug code (searched for their identifiers). It does contain the flag resolver and tier table, which `ProSkin` needs to decide what to load. The Share path grew by about 4.7 kB raw over step 2. We have not measured the Share skin alone against a stock skin; almost all of the 963 kB is Video.js and its streaming engine.

### Checks

- **Tests:** `npm test`, 37 passing: timecode (24, 25, 30, 50, 60, 23.976, 29.97 non-drop and drop-frame, 59.94 drop-frame, round trips, bad input), `resolveFeatures`, store invariants, guides filter, per-instance stores.
- **Render check** (public URL, `?debug`, 2 s of playback): the skin's render count stayed at 4 while the readout's went from 6 to 61. Locally: skin 2, readout 126. The skin does not re-render per frame.
- **Frame clock** (Chrome on macOS, 30 fps demo stream, no burned-in frame counter): source `rvfc`, precision `frame`. Seeking to 18 known frame times while paused gave the expected frame 16 times; the 2 misses were long seeks that had not finished within the 450 ms the test waited, and they showed the previous frame, not an off-by-one. Seeking to frame 300 on the public URL gave frame 300, media time 10.000, timecode 00:00:10:00.
- **Step 2 regression:** the keyboard-only checks were re-run on the public URL and pass (play, pause, seek, mute, captions, free keys, help dialog and focus return). Skin CSS is byte-identical to the `step-2-share-gate` tag.

## Step 4: Review transport (15 Nov 2026)

### Verified APIs

- `useHotkey({ keys, onActivate, action, repeatable, disabled })` for every Review key. Patterns match modifiers exactly, so `.` and `>` (Shift+.) do not collide, and Ctrl/Cmd/Alt combinations are left to the browser.
- `Menu.Root / Trigger / Popup / Content / Item (onSelect, disabled)` for the More menu; `Menu.Popup` is the popup, there is no separate `Popover`.
- `Tooltip` with a custom `label` node on plain buttons (`ButtonTooltip label={…}`).
- `usePlayer(selectPlayback)` for `paused`; `usePlayer(selectPiP)`.
- The `<video>` element is reached through `useVideoElement` (step 3); `drawImage(video)` on a canvas works for the HLS stream.

### How the Review controls get into the bar

The Share bar renders four empty slots (`transport-start`, `transport-end`, `time`, `tools`) only when `ProSkin` asks for them. The lazy Review module portals its controls into them, so they sit in the bar's layout and focus order while their code stays out of the Share path. With any Review control on, the seek bar always has its own row, and the button row wraps.

### Decisions

- **Seek offset:** half a frame, `(frame + 0.5) / fps`. No change was needed in Chrome.
- **Held keys:** a step is computed from the frame last asked for, and while a seek is running only the newest target is kept. 12 key repeats 33 ms apart moved exactly 12 frames.
- **Inversion:** the store swaps the points (step 3 rule); the skin announces "In was after Out, so the two points were swapped", with both timecodes. Marking Out on the In frame is refused and announced.
- **Loop start rule:** with loop on, pressing play with the playhead before In jumps to In first. Past Out it also jumps to In, because the playhead is at or beyond the loop point.
- **Loop point:** Out counts as reached half a frame early. A range that runs to the end of the media loops on the `ended` event.
- **Play range** is in the More menu, and inline at 1100 px and wider. It pauses on the frame before Out.
- **Cut list:** chapter starts when the media has a chapters track, otherwise the `markers` prop. Cuts are compared by frame. For 750 ms after a cut jump, the next press counts from that cut, so pressing "previous" twice moves two cuts even during playback.
- **Grab frame** is one button that downloads the PNG; "Copy frame image" is a separate item in More. One press for the common task, and no nested menu.
- **Link format:** `#t=HH:MM:SS:FF`, always the timecode on screen (start offset and drop-frame included), whatever `timeDisplay` is, because a timecode names a frame and seconds do not. Other hash content is kept. Plain seconds are accepted when reading.
- **Announcements:** one polite live region owned by the Review module. Video.js's `StatusAnnouncer` cannot speak custom text, so it keeps the built-in actions and ours carries the pro ones. Results a sighted user needs ("Link copied", capture refused) also show as a short toast.
- **Timecode button:** named "Time in seconds" with `aria-pressed`; the current value is its description, read on focus. It is not a live region.
- **Bar breakpoints (player width):** under 880 px Range and Actions live in More; from 880 px they are inline; from 1100 px Play range, the volume slider and the PiP button are also inline; from 1360 px the range readout is inline. Under 1100 px PiP is in More.
- The Review layer needs no title for file names yet: grabbed files are named `frame_<timecode>.png`.

### Checks (Chrome on macOS, through page scripts; the browser window was hidden, see Unverified)

| Check | Result |
| --- | --- |
| Step 30 forward, 30 back (buttons locally, `.` `,` on the public URL) | Returns to the start frame both times (500→530→500, 200→230→200) |
| `,` `.` `←` `→` (paused) `Shift+←/→` | ±1 and ±10 frames, exact |
| `←` `→` while playing in Review | Seek 5 s, as in Share |
| `.` while playing | Pauses, then steps |
| Start edge | No movement, announces "Start" |
| Timecode in the bar against the debug readout | Identical |
| Mark In, Out, loop by keyboard (`I`, `O`, `R`) | Works; loop ran 180→120 twice in 3.5 s |
| Loop accuracy | The Out frame itself is shown before the jump: a one-frame overshoot, every time |
| Play outside the range with loop on | Jumps to In |
| Play range | Pauses one frame before Out (119 for Out 120) |
| Previous/next cut from chapters | 40 s → 52 s; previous twice → 20 s → 0 s; "No previous cut" at the start |
| No chapters and no markers | Cut buttons disabled, reason in name and tooltip |
| Grab frame, CORS source | 1920×1080 PNG, `frame_00-00-12-05.png` |
| Grab frame, source without CORS (`?media=nocors`) | No file; "This video's host does not allow frame capture." announced and shown |
| Copy link, then open it | `…#t=00:00:12:05`; reopened on frame 293 at 24 fps, paused, other hash data kept |
| Poster frame | Announces the timecode |
| Help dialog | 11 rows in Share, 19 in Review |
| More menu by keyboard | Opens, focus moves in, arrows move the highlight, disabled items do nothing |
| Share tier | No slots, no pro chunk requested, pro keys do nothing, keyboard checks pass on the public URL |

### Chunk sizes (gzip)

| Chunk | Step 3 | Step 4 |
| --- | --- | --- |
| Share path JS | 284.1 kB (963.0 kB raw) | 284.6 kB (964.7 kB raw) |
| Skin CSS | 5.6 kB | 5.6 kB |
| Pro runtime | 3.3 kB | 3.5 kB |
| Review JS + CSS | 86 B | 7.6 kB + 1.2 kB |

The Share path grew by 1.7 kB raw: the bar slots, the "arrows only while playing" switch and the extra help rows are hooks that have to live in the Share skin. No Review logic is in it (searched for its identifiers).

## Deployed URL

- https://videojs-pro.vercel.app (Vercel production, project `videojs-pro`). Deploy: `npm run deploy vercel`. Player alone: `/preview.html`.
- Vercel's "Deployment Protection" is on for preview deployments only; the production domain answers 200 with no login (checked with curl and in Chrome).

## Decisions

- CLI choices: `skin create --name videojs-pro --framework react --styling css --base scaffold --preset video --package-manager npm`. TypeScript is always on; the CLI has no option for it.
- The CLI refuses a non-empty folder, so it ran in a scratch folder and was copied into the repo root (which already held `specs/`).
- Kept the scaffold's `CLAUDE.md` → `@AGENTS.md` import and added the project guide below it.
- Demo media: the scaffold's default Mux stream (NASA Cosmic Dawn trailer, with a chapters VTT). It is now named in one file, `apps/preview/src/frame/media.ts`, which step 8 replaces.
- `deploy:vercel` passes `--prod`. Vercel's Deployment Protection puts preview URLs behind a Vercel login by default, and the submission needs a public URL.
- `package.json` has `engines.node: 24.x`. Vercel rejected the project's default of Node 26.x (this machine's version) as discontinued. Local Node 26 still builds fine.
- Step 2 layout: one row when the player is 640 px wide or more; below that the seek bar gets its own row above the buttons, because a short bar between buttons is hard to hit. The DOM order switches with the layout (`useStacked`), so the focus order always matches the visual order.
- Step 2: the control bar shows before playback starts (a tool shows its controls). Hosts can restore the stock behaviour with `--media-controls-before-start: hidden`.
- Step 2: the centre play button is a duplicate of the bar's play button, so it is `aria-hidden` and out of the tab order. It shows before playback, and on touch whenever controls are visible.
- Step 2: the volume control is an inline horizontal slider, not the scaffold's hover popover.
- Step 2: AirPlay and Cast buttons, the title and the centre seek buttons were removed. They are not in the Share control list.
- Step 2: no `@scope` and no CSS nesting, to hold the browser floor. `:dir(rtl)` has an attribute fallback for Chrome 111–119.
- Step 2: the mono font is JetBrains Mono 500 (OFL 1.1), from `@fontsource/jetbrains-mono` 5.3.0, subset with fonttools to printable ASCII plus `×`, `−` and arrows: 4.9 kB woff2. Licence in `src/assets/fonts/OFL.txt`.
- Step 2: icons are our own drawings (no base set), in `src/video/icons/`.
- Step 2: the skin's own strings are in `src/video/strings.ts` (English only). Video.js control labels come from Video.js i18n and do follow the locale.
- Only `@videojs/*` packages are pinned exactly. The other dependencies keep the scaffold's caret ranges, locked by the lockfile.

## Later

- Give `ProSkin` a title for grabbed file names (`<title>_<timecode>.png`).
- Stop the Out frame flashing at the loop point (jump one frame earlier) if it bothers in use.
- Translate the Review strings (`src/pro/review/strings.ts`).
- Persist View choices (overlays, time display) per browser: step 6. `activeOverlays` is a set of ids and `timeDisplay` a string, so both serialise directly.
- Measure the Share skin's own weight against a stock Video.js skin.
- Redraw the settings icon: it reads a little like a sun.
- AirPlay and Cast buttons (removed in step 2), with custom icons.
- Translate `src/video/strings.ts` through Video.js i18n (`Text` tokens) so the help dialog follows the locale.
- Soften the top edge of the control-bar scrim.

- Code-split the preview bundle: `preview-*.js` is 972 kB minified, and Vite warns about it. Check whether the Share tier stays "as light as a stock skin" in step 2.
- Tailwind, Base UI and Heroicons are devDependencies of the workbench shell only. The skin itself is plain CSS; keep it that way.
- Consider pinning the non-Video.js dependencies exactly before submission.
- Update the deploy script's `vercel@64` if Vercel 64 causes problems; 65 is current.

## Unverified

- **Step 4: nothing was looked at.** The Chrome window was hidden for the whole step (0×0 viewport, screenshots timed out), so the Review bar's appearance, the new icons, the wrapping and breakpoints, focus rings, tooltips and the toast were never seen. Behaviour was tested through page scripts. This needs a visual pass before step 5.
- **Step 4: mouse-only range and loop** was exercised by clicking buttons from script, not with a real pointer. **320 px layout**, **touch**, **Firefox** and **Safari** were not run.
- **Step 4: Copy frame image** gave no result in the hidden window: neither success nor failure was announced, so the clipboard call probably never settled. Untested in a visible window.
- **Step 4: copy link** was tested with the clipboard call replaced by a stub; the real clipboard was not written.
- **Step 4: `onInOutChange`, `onCopyLink`, `onPosterFrame`, `onMarkerSelect`** are wired but the preview passes no handlers, so they were not seen firing in the browser (the store callbacks are unit-tested).
- **Step 4: cuts from `markers`** are covered by unit tests only; the demo stream has chapters.
- **Step 4: screen reader** output was read from the live region's text, not heard.
- **Step 3: frame numbers against a burned-in frame counter.** The demo stream has none. Our own 24 fps video (step 8) should carry one so this can be checked.
- **Step 3: frame clock in Firefox and Safari.** Firefox before 132 has no `requestVideoFrameCallback` and will use the approximate fallback; neither browser was run.
- **Step 3: phone-width re-check after step 3.** The Chrome window became hidden (0×0 viewport, screenshots timed out), so the layout could not be looked at again. The bar markup changed only by two optional slots and the CSS is unchanged.
- **Step 3: two `ProSkin` players on one page** were not rendered together; per-instance state is covered by a unit test on the store.
- **Step 3: dropped-frame counts** in the readout were high (the hidden window throttles rendering), so they say nothing about real playback.
- **Fullscreen after the reskin** (see the gate table): the browser session refused all fullscreen requests.
- **Touch**: 44 px targets, tap, double-tap, tap-to-play on iOS Safari. The HTML package has a known iOS tap issue; we use React, but this is still untested.
- **Reduced motion**, **screen reader**, **Firefox**, **Safari**, and the browser floor versions (Chrome 111, Firefox 121, Safari 16.4).
- **Retry on a source that is still broken**: retry reloads the source, but Video.js did not raise a second error, so no dialog comes back and the player stays empty. Its error feature only mirrors the media element's `error` event.
- Whether custom properties work inside `::cue` in Safari; literal colours are set first as a fallback.
- Tooltip `Esc` dismissal was not tested by hand; tooltips close when focus or hover leaves.

- **Playback on the live URL** was checked in Chrome on `/preview.html`: it plays at 1920×1080 unmuted at full volume, fullscreen works, and the English and Japanese subtitle tracks and chapters are present. Not checked: actually hearing the audio, captions rendering on screen, Safari and Firefox.
- The version shown on the live docs site.
- A truly clean browser session (the Chrome used is the author's own profile, though the site needs no login), and a mobile viewport.
- Build warnings, harmless so far: chunk size over 500 kB, and a Rolldown note on `"use no memo"` in `react-compiler-runtime`.
