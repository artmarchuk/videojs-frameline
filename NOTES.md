# NOTES

Read this at the start of every step, along with `specs/PROJECT-OVERVIEW.md` and the step's requirements file.

**Tier names.** Until step 6 there were three tiers: Share, Review and Studio. Step 6 merged Review and Studio into **Studio** and renamed Share to **Viewer**. The sections for steps 2 to 5b below were renamed with the code, so "Studio" there means what was then called Review (the old Studio tier had no UI). Things step 6 removed are still described in those sections as history: the Tools tray, the Tools button, the playhead's permanent bubble, the marker lane and its cluster badges, Play range, `toolsOpen`. The git tag `step-2-share-gate` keeps its name.

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

## Step 2: Skin foundation and Viewer tier (15 Nov 2026)

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
- The scaffold bound `I` to picture-in-picture; removed, because the Studio tier needs `I`.
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

A small separate store next to the player (`src/pro/store.ts`), created once per `ProSkin`, read through a React context and `useSyncExternalStore` with selectors. Reasons: Video.js has no documented custom-feature API; the skin does not own `createPlayer`, so it could not add a feature even if there were one; and a separate store keeps every pro byte out of the Viewer path.

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
| `preview-*.js` (Viewer path: React, Video.js with the Mux/HLS engine, the Viewer skin, `ProSkin` wrapper and flag resolver) | 963.0 kB | 284.1 kB | always |
| `preview-*.css` (skin styles; byte-identical to the step 2 tag) | 30.7 kB | 5.6 kB | always |
| `runtime-*.js` (store, frame clock, timecode) | 7.7 kB | 3.3 kB | any pro feature or debug is on |
| `studio-*.js` (empty until steps 4 to 7) | 47 B each | 86 B each | a feature of that tier is on |
| `debug-*.js` + `debug-*.css` | 1.3 kB + 0.7 kB | 0.8 kB + 0.4 kB | `debug` or `?debug` |
| `dev-tier-switch-*.js` (preview app only) | 0.4 kB | 0.3 kB | `?debug` |

Checked on the public URL without `?debug`: no pro chunk is requested. The Viewer chunk contains none of the store, clock, timecode or debug code (searched for their identifiers). It does contain the flag resolver and tier table, which `ProSkin` needs to decide what to load. The Viewer path grew by about 4.7 kB raw over step 2. We have not measured the Viewer skin alone against a stock skin; almost all of the 963 kB is Video.js and its streaming engine.

### Checks

- **Tests:** `npm test`, 37 passing: timecode (24, 25, 30, 50, 60, 23.976, 29.97 non-drop and drop-frame, 59.94 drop-frame, round trips, bad input), `resolveFeatures`, store invariants, guides filter, per-instance stores.
- **Render check** (public URL, `?debug`, 2 s of playback): the skin's render count stayed at 4 while the readout's went from 6 to 61. Locally: skin 2, readout 126. The skin does not re-render per frame.
- **Frame clock** (Chrome on macOS, 30 fps demo stream, no burned-in frame counter): source `rvfc`, precision `frame`. Seeking to 18 known frame times while paused gave the expected frame 16 times; the 2 misses were long seeks that had not finished within the 450 ms the test waited, and they showed the previous frame, not an off-by-one. Seeking to frame 300 on the public URL gave frame 300, media time 10.000, timecode 00:00:10:00.
- **Step 2 regression:** the keyboard-only checks were re-run on the public URL and pass (play, pause, seek, mute, captions, free keys, help dialog and focus return). Skin CSS is byte-identical to the `step-2-share-gate` tag.

## Step 4: Studio transport (15 Nov 2026)

### Verified APIs

- `useHotkey({ keys, onActivate, action, repeatable, disabled })` for every Studio key. Patterns match modifiers exactly, so `.` and `>` (Shift+.) do not collide, and Ctrl/Cmd/Alt combinations are left to the browser.
- `Menu.Root / Trigger / Popup / Content / Item (onSelect, disabled)` for the More menu; `Menu.Popup` is the popup, there is no separate `Popover`.
- `Tooltip` with a custom `label` node on plain buttons (`ButtonTooltip label={…}`).
- `usePlayer(selectPlayback)` for `paused`; `usePlayer(selectPiP)`.
- The `<video>` element is reached through `useVideoElement` (step 3); `drawImage(video)` on a canvas works for the HLS stream.

### How the Studio controls get into the bar

The Viewer bar renders four empty slots (`transport-start`, `transport-end`, `time`, `tools`) only when `ProSkin` asks for them. The lazy Studio module portals its controls into them, so they sit in the bar's layout and focus order while their code stays out of the Viewer path. With any Studio control on, the seek bar always has its own row, and the button row wraps.

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
- **Announcements:** one polite live region owned by the Studio module. Video.js's `StatusAnnouncer` cannot speak custom text, so it keeps the built-in actions and ours carries the pro ones. Results a sighted user needs ("Link copied", capture refused) also show as a short toast.
- **Timecode button:** named "Time in seconds" with `aria-pressed`; the current value is its description, read on focus. It is not a live region.
- **Bar breakpoints (player width):** under 880 px Range and Actions live in More; from 880 px they are inline; from 1100 px Play range, the volume slider and the PiP button are also inline; from 1360 px the range readout is inline. Under 1100 px PiP is in More.
- The Studio layer needs no title for file names yet: grabbed files are named `frame_<timecode>.png`.

### Checks (Chrome on macOS, through page scripts; the browser window was hidden, see Unverified)

| Check | Result |
| --- | --- |
| Step 30 forward, 30 back (buttons locally, `.` `,` on the public URL) | Returns to the start frame both times (500→530→500, 200→230→200) |
| `,` `.` `←` `→` (paused) `Shift+←/→` | ±1 and ±10 frames, exact |
| `←` `→` while playing in Studio | Seek 5 s, as in Viewer |
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
| Help dialog | 11 rows in Viewer, 19 in Studio |
| More menu by keyboard | Opens, focus moves in, arrows move the highlight, disabled items do nothing |
| Viewer tier | No slots, no pro chunk requested, pro keys do nothing, keyboard checks pass on the public URL |

### Chunk sizes (gzip)

| Chunk | Step 3 | Step 4 |
| --- | --- | --- |
| Viewer path JS | 284.1 kB (963.0 kB raw) | 284.6 kB (964.7 kB raw) |
| Skin CSS | 5.6 kB | 5.6 kB |
| Pro runtime | 3.3 kB | 3.5 kB |
| Studio JS + CSS | 86 B | 7.6 kB + 1.2 kB |

The Viewer path grew by 1.7 kB raw: the bar slots, the "arrows only while playing" switch and the extra help rows are hooks that have to live in the Viewer skin. No Studio logic is in it (searched for its identifiers).

## Step 5: Ruler timeline (15 Nov 2026)

Built with the step 5b look from the start (the author's instruction): system typeface, graphite palette, white playhead, blue range band, compact ruler labels. The step 2 lime, the monospace font and the full-timecode ruler labels were never built. The dock layout itself is step 5b; at this checkpoint the timeline still sits in the overlay bar.

### Verified APIs (`@videojs/react` 10.4.0, docs and `dist/` source)

- `TimeSlider.Root` props: `label`, `step` (1 s), `largeStep` (10 s), `changeThrottle` (100 ms), `pauseOnDrag`, `thumbAlignment`, `disabled`, `onDragStart`, `onDragEnd`. It sets `--media-slider-fill`, `--media-slider-pointer`, `--media-slider-buffer` and `data-dragging`, `data-pointing`, `data-interactive`, `data-seeking`, `data-disabled` on the root. It has **no** value-format or seek hook: it calls the store's `seek()` itself.
- Parts: `Track`, `Fill`, `Buffer`, `Thumb`, `Preview` (`overflow="clamp" | "visible"`, positions itself at the pointer), `Value` (`type="pointer" | "current"`, `format`), `ChapterTitle`, `Chapters` (`renderChapter(props, state)`; sets `--media-slider-chapter-start/end` on each range), `Markers` (draws cues of a text track; not used, our markers are a prop).
- `Thumb` carries `role="slider"`, `aria-label` ("Seek"), `aria-valuenow/min/max`, `aria-valuetext`, and takes the keys in `onKeyDownCapture`: arrows ±`step` (after rounding the time to a multiple of `step`), `Shift`+arrow and `PageUp`/`PageDown` ±`largeStep`, `Home`, `End`. It calls `preventDefault`, so the player's hotkeys skip the key. Its `render` prop receives all of this.
- Pointer: the **root** owns `pointerdown/move/up` with pointer capture; a drag starts after a small movement threshold; `lostpointercapture` ends it. Hotkeys are a native `keydown` listener on the container that ignores events with `defaultPrevented`.
- `Slider.Thumbnail.Root / Image` use the media's storyboard; the demo stream has one, and a chapters track.
- `Controls.Root visibility="always"` exists (for step 5b). The fullscreen request targets the `Container`.

### How it is built

- `src/pro/studio/timeline/`: `logic.ts` (pure), `index.tsx`, `timeline.css`. It is part of the lazily loaded Studio chunk, not a chunk of its own: no flag turns the timeline off on its own, so a second request would only add a flash.
- The Viewer bar renders a `timeline` slot instead of its seek bar when pro controls are on; the Studio module portals the timeline into it.
- **Ticks** are drawn on one `<canvas>` at device-pixel positions (crisp at any DPR; two device pixels wide from 3x). Only the labels of major ticks are DOM text (at most width / 80). Redrawn on `ResizeObserver`, duration or fps change.
- **Tick chooser:** steps 1, 2, 5, 10 frames (only those that divide a second at the given rate), then 1, 2, 5, 10, 15, 30 s, 1, 2, 5, 10, 15, 30 min, 1 h and up. Minor ticks at least 6 px apart; labelled ticks at least 80 px apart and always on whole seconds. A labelled interval that leaves room for a middle level is preferred when it is at most twice the smallest that fits (60 s at 1166 px: 1 s, 5 s, 10 s).
- **Ruler labels** (5b.6): `0s`, `10s` when the clip is under a minute; `0:30`, `1:30` otherwise; `1:00:00` only for positions of an hour or more, so a zero hours field never shows. The ruler counts from zero; `startTimecode` applies to the bubble, field and readouts, not to the ruler.
- **Markers:** points are flags, ranges are bars, and points within 12 px collapse into one **cluster badge with a count** (one lane; two stacked rows were too tall and unreadable at phone width). Shape tells the kinds apart. Positions clamp so markers at 0 and at the end stay inside. A marker past the end is drawn at the end. More than 200 render (clustered) with a dev warning. The lane is pointer-only and `aria-hidden`; every marker is a menu item in More > Markers, and `[` `]` use markers when the media has no chapters.
- **Selected marker** is new store state (`selectedMarker`), drawn in the accent.
- **Range band:** drawn inside each chapter's track, so chapter gaps cut through it. Its geometry is two CSS variables; the played part follows `--media-slider-fill`, so nothing re-renders per frame. It is drawn to the Out time. The loop shows the Out frame before jumping (step 4), so the range in effect **includes the Out frame**; that is under a pixel at normal widths.
- **Handles:** `role="slider"` elements after the seek thumb in the DOM. A drag is previewed locally and committed on release, so `onInOutChange` fires once per drag. Each key press on a handle commits (one event per press). Handle keys use a native listener on the handle so they are marked handled before the player's hotkeys run.

### Decisions

- **Slider keys, one behaviour:** on the focused seek slider `←` `→` (and `↑` `↓`, as on any slider) step one frame while paused and seek 5 s while playing; `Shift` jumps 10 frames. These replace the stock 1 s / 10 s arrow steps, and are prevented so the global map does not also fire. `Home`, `End`, `PageUp`, `PageDown` stay stock (start, end, ±10 s), then snap.
- **Frame snapping:** a `seeking` listener moves every seek in Studio (timeline, slider keys, `J` `L`, number keys, `Home` `End`) to the middle of the frame it lands in, with the step 4 function. It runs inside the `seeking` event, so the browser does one seek. Scrubbing stays as smooth as stock: Video.js already throttles drag seeks to one per 100 ms. `End` therefore lands on the last frame, not on "ended".
- The quiet hover bubble and thumbnail float above the timeline; over a marker the marker's tooltip replaces them.
- Toggled-on tool buttons use `--pro-on`, not the accent (5b.2), already here.

### Checks (headless Google Chrome 1280x800 unless noted, driven by Playwright; see "How screenshots were taken")

| Check | Result |
| --- | --- |
| Unit tests | 105 passing (43 new: tick chooser, labels, time and pixels, snapping, marker layout, handle maths, band, bubble clamp) |
| Seek slider semantics | `role="slider"`, name "Seek", `aria-valuetext` `00:00:10:00` |
| Slider keys, paused | `→` 300→301, `←` `←` →299, `Shift+→` →309, `PageUp` +10 s, `End` last frame (3332), `Home` frame 0; each seek lands on a frame centre |
| Slider keys, playing | `→` seeks 5 s, playback continues |
| Click and drag | Click at 50% → 55.55 s (frame 1666 centre). Drag leaving the track vertically keeps tracking; released at 70% → 77.78 s; no stuck drag |
| Handles by keyboard | Tab order Seek, In point, Out point. `→` +1 frame, `Shift+←` −10, `End`/`Home` to the limits (one frame from the other point), `Delete` clears and focus returns to the seek slider. The playhead does not move. Announced: "In point moved to 00:00:13:21", "Out point cleared" |
| Handles by mouse | Bubble shows the timecode while dragging; store unchanged until release; one `inout:change` per drag; dragging In past Out swaps and says so |
| Markers | Tooltip "Logo too small 00:00:08:12"; click seeks to frame 252 and fires `marker:select`; the marker turns blue; More > Markers lists all and seeks |
| Events in the log (`?debug`) | `inout:change`, `marker:select`, `frame:change` seen. `link:copy` and `poster:frame` are wired the same way; not pressed in this run |
| Touch (Chrome touch emulation, CDP touch events, coarse pointer) | Dragging the playhead and the Out handle moves them; the page (made 3 screens tall) did not scroll; bar buttons are 44 px |
| Reduced motion (emulated) | No element of the skin has a transition or animation duration above 0 |
| Long video | A one-hour duration (the element's `duration` overridden in the page): labels `0:00 10:00 … 50:00` at 1280 px, `0:00 30:00` at 320 px. 10 s: `0s … 9s` with frame ticks |
| Bar height | 170 px at 1280 px wide (34% of a 504 px picture). **At 360 px: 242 px on a 176 px picture; the bar is taller than the video and its top is clipped.** Not tightened: step 5b moves the controls into a dock below the picture, which removes the problem |
| Viewer tier | Tab order, play/pause, seek keys, mute, volume, captions, help dialog and focus return, free keys: all as in step 2. No pro chunk requested. 320 px: nothing overflows |

### Moodboard comparison

Matches: a ruler with fine ticks and sparse labels, a bubble riding the playhead, a highlighted range with handles at both ends, graphite panels, controls on their own surface. Different on purpose: the accent is a soft blue kept for the range, where the moodboard uses yellow for everything selected; the playhead and its bubble are white; the bubble shows full timecode, not `mm:ss`; labels are seconds-first; there is one track, not clip lanes, thumbnails or audio (out of scope); markers get their own lane.

### What looked wrong in the step 4 bar (first time anyone saw it)

Fourteen icon buttons of equal weight in one strip with no grouping; the eye finds nothing first. The cut buttons read as rewind and fast-forward. The In/Out range could not be seen on a 4 px bar. The lime accent and the monospace timecode were the loudest things on the screen. At 360 px the bar wrapped into three ragged rows and covered most of the picture. The preview page showed a small player on a white page. Step 5b addresses all of these.

### Chunk sizes (gzip)

| Chunk | Step 4 | Step 5 |
| --- | --- | --- |
| Viewer path JS | 284.6 kB (964.7 kB raw) | 285.0 kB (965.8 kB raw) |
| Skin CSS | 5.6 kB | 5.9 kB (31.6 kB raw: new tokens) |
| Monospace font | 4.9 kB | removed |
| Pro runtime | 3.5 kB | 3.5 kB |
| Studio JS + CSS | 7.6 kB + 1.2 kB | 12.2 kB + 2.9 kB |

The Viewer JS grew by 1.1 kB raw. About half is the skin (the `timeline` slot and passing `renderThumbnail` to pro modules); the rest is the preview app (sample markers, event handlers). No timeline code is in it (searched for `chooseTicks`, `snapSeekTime`, `pro-tl-`).

### How screenshots were taken

The Claude-in-Chrome window was not used. Screenshots and behaviour checks ran in **headless Google Chrome** (the installed Chrome, so H.264 plays), driven by `playwright-core` from a scratch folder outside the repository, at 2x device scale. Each image was opened and looked at. Files: `design/screenshots/step-5/`.

## Step 5b: Dock layout, Tools tray and restyle (15 Nov 2026)

### What I thought was wrong with the old Studio bar (written before changing it, from the first real screenshots)

See "What looked wrong in the step 4 bar" under step 5. In short: no hierarchy (fourteen equal buttons), controls over the picture and taller than it on a phone, an invisible range, lime and monospace louder than the footage, a small player on a white page.

### Verified APIs

- **Fullscreen targets the `Container`** (docs: "When the user goes fullscreen, the container goes fullscreen, not the video element"; `requestFullscreen()` "targets the player container" when the Fullscreen API exists, and falls back to the media element's native presentation otherwise, as on iPhone Safari). So the dock is a child of the `Container`, next to the stage, and stays in fullscreen. No workaround was needed.
- Media registers through context, so the media element does not have to be a direct child of the `Container`; it sits in the stage.
- `Controls.Root visibility="always"` keeps the controls visible and reports the user as active. The dock uses it: no auto-hide.
- `Gesture` ignores pointer activity that starts on interactive controls or on anything marked `data-interactive`. The dock carries `data-interactive`, so a click between its buttons does not toggle playback; a click on the picture still does. On touch in the dock layout a tap on the picture plays or pauses (there are no controls to reveal).
- Hotkeys skip events with `defaultPrevented`; `Tooltip.Trigger render` reads its child element's ref, which React 19 warns about when the child was given a `ref`, so no ref is put on tooltip children.

### How it is built

- `ProSkin layout="dock" | "overlay"`; default `overlay` for Viewer and `dock` for Studio (`resolveLayout`, tested). `data-layout` on the container; shown in the debug readout.
- Dock structure, in the Viewer skin so that Viewer can dock too without pro code: `Container` > `.pro-stage` (media, poster, overlay layer, pro layers, indicators) + the control bar as a static panel. The skin is a flex column; the stage has `aspect-ratio: var(--pro-stage-ratio, 16 / 9)` and may shrink, the dock may not. With a fixed height (or fullscreen) the stage takes what is left and the picture is letterboxed.
- The pro bar's main row is rendered by the Viewer skin as groups with slots: `time-start`, Transport (`transport-start`, Play, `transport-end`), `time`, host slot, `tools`, `tray`, spacer, host slot, Playback. The Studio module fills the slots.
- **Tray position:** in the DOM the tray comes right after the Tools button (so Tab goes Tools → tray → Playback, as the brief asks); CSS `order` lays it out as a full-width row under the main row.
- **Narrow order:** below 560 px (680 px on touch) the order of controls changes (timecode, step, Play, cut), so the DOM changes with it. The Studio module measures the container, picks `wide`, `medium` or `narrow` (`chooseDockSize`, tested) and writes `data-dock-size` on the container. Everything else is container queries.
- `toolsOpen` is in the pro store (default closed, `setToolsOpen`, tested). Persistence comes in step 6.
- `--pro-frame-border: 1` draws a 1 px hairline and a 10 px radius around the player. Default: none. The preview page sets it.

### Decisions, and where I chose differently from the brief or the mockups

- **Markers, Play range, Clear range, Copy frame image** had no place in the brief's tray (the old More menu is gone). Now: Range has a chevron menu (Play range, Clear range); Grab has its chevron menu (Download PNG, Copy frame image), as the brief says; and the tray has a fourth group, **Markers** (button with a count, menu of every marker), shown only when there are markers.
- **Responsive, 560 to 899 px:** the full main row needs about 900 px, so it cannot stay on one line down to 560 px without giving things up. In order: volume slider (under 900), PiP button and fps label (under 820; PiP moves into the settings menu), the Tools summary (under 760), the full Tools label, replaced by "Tools" (under 700; the accessible name stays "Range, Capture, View"), the captions button (under 640; `C` and the settings menu remain). With that the row is one line at every width from 560 px.
- **Touch stays narrow up to 680 px**, because 44 px targets need the room.
- **Narrow row 2** is Tools, Mute, Settings, Fullscreen: Settings fits, and it holds captions, speed and PiP, so no separate More menu is needed. Under 352 px the Tools label is the short one and the range readout shows the length only.
- **320 px:** four 40 px buttons do not fit beside Play and the timecode (they would be 31 px wide). Under 350 px the previous/next cut buttons step aside; step, Play, timecode, Tools, Mute, Settings and Fullscreen stay, all 44 px tall and at least 40 px wide. `[` `]` and the Markers menu still work. The brief asked me to say so.
- **Ruler at a narrow width:** the mockup shows a tick per second at 326 px; the 6 px rule gives a tick every 2 s there. The rule won.
- **Toggled-on (`--pro-on`) against the control fill is only 1.48:1**, too little for a state. "On" buttons in the dock also draw a short bar in the text colour (8.4:1). Loop uses it.
- **Dim text on `--pro-surface-3` is 4.05:1** with the proposed `--pro-text-dim`. Added `--pro-text-dim-raised` (#B2B2B8, 5.37:1) for dim text in tooltips and on hovered controls.
- `--pro-track` (the unfilled track over footage in the Viewer overlay) moved to a neutral #85858C; the dock's track is `--pro-surface-2` as specified.
- In/Out buttons no longer light up when a point is set: they are not toggles, and the band shows the range.
- The timecode field shows the current frame only; the total moved to its tooltip and its accessible description.
- **Seconds-only ruler labels** are used up to and including 60 s (the mockup's 60 s clip reads `0s … 50s`).
- The preview page **opens in the Studio tier** (`?tier=viewer` for Viewer), since the page is now a monitor. `?layout=dock|overlay` and `?density=compact` are also read.
- Also changed beyond the brief: tooltips lost their keycap chips everywhere (Viewer too), popups got one soft shadow, the Viewer playhead is white, the Viewer primary dialog button is neutral, captions-on and PiP-on use `--pro-on`.

### Contrast (computed by `node scripts/contrast.mjs`)

| Pair | Ratio | Minimum | Result |
| --- | --- | --- | --- |
| text on surface-0 (timecode field) | 17.25:1 | 4.5 | PASS |
| text on surface-1 (dock, menus) | 14.89:1 | 4.5 | PASS |
| text on surface-2 (controls) | 12.45:1 | 4.5 | PASS |
| text on surface-3 (hover, tooltips, badges) | 10.13:1 | 4.5 | PASS |
| text on --pro-on (a toggle that is on) | 8.39:1 | 4.5 | PASS |
| text-dim on surface-0 (fps label) | 6.89:1 | 4.5 | PASS |
| text-dim on surface-1 (labels, ruler labels) | 5.95:1 | 4.5 | PASS |
| text-dim on surface-2 (controls) | 4.97:1 | 4.5 | PASS |
| text-dim-raised on surface-3 (shortcut in a tooltip, marker tooltip time) | 5.37:1 | 4.5 | PASS |
| text-dim on surface-3: NOT USED for text (see text-dim-raised) | 4.05:1 | - | PASS |
| ink on text fill (Play, playhead bubble) | 15.22:1 | 4.5 | PASS |
| accent-ink on accent (handle bubble) | 6.88:1 | 4.5 | PASS |
| white text on accent: NEVER USED, shown as a warning | 2.72:1 | - | PASS |
| text on scrim (0.88) over white frame | 12.66:1 | 4.5 | PASS |
| text-dim on scrim (0.88) over white frame | 5.06:1 | 4.5 | PASS |
| accent (progress fill) on scrim over white frame | 5.20:1 | 3 | PASS |
| slider track (--pro-track) on surface-0 | 5.26:1 | 3 | PASS |
| slider track (--pro-track) on scrim over white | 3.86:1 | 3 | PASS |
| Viewer playhead (text) on scrim over white | 12.66:1 | 3 | PASS |
| focus ring: accent on surface-0 | 7.08:1 | 3 | PASS |
| focus ring: accent on surface-1 (dock) | 6.11:1 | 3 | PASS |
| focus ring: accent on surface-2 | 5.11:1 | 3 | PASS |
| focus ring: accent on --pro-on | 3.45:1 | 3 | PASS |
| focus ring halo: surface-0 vs white frame | 19.28:1 | 3 | PASS |
| playhead (text) over the unplayed band (--pro-range) | 3.82:1 | 3 | PASS |
| playhead (text) over the played band (accent) | 2.44:1 | - | PASS |
| playhead outline (surface-0) over the played band (accent) | 7.08:1 | 3 | PASS |
| playhead (text) over the neutral track (surface-2) | 12.45:1 | 3 | PASS |
| unplayed band (--pro-range) against the neutral track | 3.26:1 | 3 | PASS |
| played band (accent) against the unplayed band, decorative: position also shown by the playhead | 1.57:1 | - | PASS |
| played band / progress fill (accent) against the neutral track | 5.11:1 | 3 | PASS |
| bracket handles (accent) against the dock (surface-1) | 6.11:1 | 3 | PASS |
| bracket handles (accent) against the neutral track | 5.11:1 | 3 | PASS |
| bracket handles (accent) against the unplayed band, decorative: the handle also has a shape | 1.57:1 | - | PASS |
| markers (text-dim) on the dock | 5.95:1 | 3 | PASS |
| selected marker (accent) on the dock | 6.11:1 | 3 | PASS |
| major ticks on the dock | 5.11:1 | 3 | PASS |
| mid ticks on the dock, decorative | 3.74:1 | - | PASS |
| minor ticks on the dock, decorative | 2.25:1 | - | PASS |
| neutral track (surface-2) on the dock, decorative: the playhead and fill carry the value | 1.20:1 | - | PASS |
| buffered line on the dock, decorative | 1.89:1 | - | PASS |
| hairline (line) on surface-1, decorative | 1.32:1 | - | PASS |
| Play fill (text) against the dock | 14.89:1 | 3 | PASS |
| toggle on (--pro-on) against control fill (surface-2): too low alone, so "on" also draws a bar in the text colour | 1.48:1 | - | PASS |
| toggle-on bar (text) against --pro-on | 8.39:1 | 3 | PASS |

The white playhead over the played (accent) band is 2.44:1 on its own; its dark outline is 7.08:1 against the accent, which is what makes it visible there. Over the unplayed band it is 3.82:1, and the unplayed band is 3.26:1 against the neutral track.

### Tabular figures

Measured in Chrome on macOS (SF Pro through `-apple-system`): with `font-variant-numeric: tabular-nums` ten of each digit are all 105.09 px wide at 17 px; without it they range from 77.28 px (`1`) to 107.58 px. No slashed or dotted zero. **Windows (Segoe UI Variable / Segoe UI) and Android (Roboto) were not run**; both fonts ship tabular figures, so digits should hold, but that is from documentation, not a test.

### Checks (headless Google Chrome, driven by Playwright; 1440x900 unless noted)

| Check | Result |
| --- | --- |
| Unit tests | 118 passing (13 new: layout resolution, dock size chooser, Tools summary, `toolsOpen`, selected marker; ruler labels updated) |
| Controls never cover the picture | Stage bottom = dock top (656 px); the dock has no auto-hide (`data-visible` always) |
| Fits 1440x900 | Tray closed: stage 657 + dock 163. Tray open: stage 600 + dock 220, picture letterboxed. No page scroll in either |
| Other sizes | 1100x800 and 800x800: main row one line, no scroll (the tray wraps to two lines at 800). 390x800 and 320x700: two rows, no horizontal overflow; the page scrolls vertically at 320x700 with the tray open (618 px player) |
| Tab order, tray closed | Player, Seek, In point, Out point, Previous cut, Step back, Play, Step forward, Next cut, Time in seconds, Tools, Mute, Volume, Captions, Settings, PiP, Fullscreen |
| Tab order, tray open | …Tools, Set In, Set Out, Loop, Range options, Grab frame, Grab options, Copy link, Poster, Markers, Guides, then Mute… |
| Tools button | `aria-expanded` false/true; Enter and Space toggle; opening moves focus nowhere; next Tab is Set In; Escape in the tray closes it and focus returns to the Tools button; Escape in an open menu closes only the menu |
| Groups | `role="group"` named Transport, Range, Capture, Go to (markers), View, Playback; no `role="toolbar"` |
| Shortcuts with the tray closed | `I`, `O`, `R`, `.` work; the closed button shows "17 s range" |
| Actions from the tray | Loop off, "Link copied" (`link:copy` logged), "Poster frame: 00:00:20:01" (`poster:frame` logged), grab downloads `frame_00-00-20-01.png`, Set In by button, Grab menu lists Download PNG and Copy frame image |
| View | Present, `aria-disabled`, "Guides. Coming in the next step" |
| Click on the picture / on the dock | Picture toggles play; a click between dock buttons does nothing |
| Fixed-height host | Skin forced to the window size: stage 0–680, dock 680–900, dock fully visible, picture letterboxed |
| **Fullscreen** | **Not driven: headless Chrome refuses `requestFullscreen` ("not granted").** The request goes to the container that holds stage and dock (docs), and the fixed-height case above is the same layout. The author should press `F` once |
| Viewer tier, new palette (step 2 gate re-run) | Keyboard only: tab order Player, Play, Mute, Volume, Seek, time, Captions, Settings, PiP, Fullscreen; `K`/`Space`, `←` `→` 5 s, `J` `L` 10 s, `5`, `Home`, `M`, `↓`, `C`, `Shift+?` (11 rows, focus in, `Esc`, focus back). Free keys (`I O , . [ ] R G Shift+←/→`) do nothing. No pro chunk requested. Narrow embed 320 px: stacked bar, nothing overflows, same keys pass |
| Viewer with `layout="dock"`, Studio with `layout="overlay"` | Both render and work (screenshots) |
| Touch emulation, 390 px | Narrow layout, 44 px controls, no horizontal overflow |
| Reduced motion (emulated) | No transition or animation above 0 ms |
| Captions on the stage | Not looked at with a captions track showing in the dock layout; the lift for overlay controls is switched off there |

### Chunk sizes (gzip)

| Chunk | Step 5 | Step 5b |
| --- | --- | --- |
| Viewer path JS | 285.0 kB (965.8 kB raw) | 285.6 kB (967.7 kB raw) |
| Skin CSS (with the preview page's own CSS) | 5.9 kB (31.6 kB raw) | 6.4 kB (34.6 kB raw) |
| Pro runtime | 3.5 kB | 3.6 kB |
| Studio JS + CSS | 12.2 kB + 2.9 kB | 13.2 kB + 3.9 kB |

The Viewer JS grew 1.9 kB raw. It is one bundle with the preview page, whose new top bar and switches are part of that; the skin's share (the grouped pro row, the stage wrapper, the layout resolver, two strings) is roughly half. That is more than "a few hundred bytes"; none of it is Studio logic (searched for `pro-tray`, `toolsSummary`, `chooseDockSize`, `pro-tl-`). The CSS growth is the dock rules (about 1 kB) and the preview page.

### Screenshots

`design/screenshots/step-5b/`, taken in headless Google Chrome at 2x as in step 5: Studio at 1440x900, 1100x800, 800x800, 390x800 and 320x700 with the tray closed and open; focus rings on the seek thumb, the In handle, Play and the timecode field; the playhead inside and outside the band, and an open range; the ruler at 10 s, 60 s and 10 min; loop on; the Markers menu; compact density; the fixed-height (fullscreen-like) layout; Viewer at 1440 and 390; the two layout overrides; touch emulation at 390. **Not captured: real fullscreen.**

## Step 6, Part A: Viewer and Studio rework (15 Nov 2026)

### What differed from the mockups before the rework (looked at in the step 5b screenshots)

The 5b build had a three-row dock about 163 px tall (220 px with the tray open) against the mockup's 116 px; a white time bubble riding the playhead; a separate marker lane with flags, bars and count badges; bracket-shaped handles that appeared only once a point was set; an accent progress fill with no range; a "Range, Capture, View" disclosure button that looked like a dropdown; the timecode in the centre with an fps label; a 1200 px page; three tier segments.

### Verified APIs (`@videojs/react` 10.4.0, `docs/reference/components/menu.md` and `dist/dev/ui/menu/*.js`)

- `Menu.Root (side, align, closeOnEscape, closeOnOutsideClick) / Trigger / Popup / Content / Item (onSelect) / CheckboxItem (checked, onCheckedChange) / RadioGroup / RadioItem (value) / ItemIndicator / Group / GroupLabel / Separator`. There is no separate `Popover` around a menu: `Menu.Popup` is the positioned popup. Roles `menu`, `menuitem`, `menuitemcheckbox`, `menuitemradio` with `aria-checked` come from the parts.
- `Menu.Trigger` sets `aria-haspopup="menu"` and `aria-expanded` itself (seen in the DOM). Arrow keys move the highlight, Enter or Space selects, Escape closes and focus returns to the trigger (tested). The docs mention type-ahead ("type-ahead search" under `data-highlighted`); not tested by hand. `Home`/`End` in a menu were not tested.
- `Menu.Item` and `Menu.RadioItem` close the menu on select (`completeMenuItemSelection`); `Menu.CheckboxItem` does not. A `RadioItem`'s `onClick` that calls `preventDefault()` skips both the value change and the close, which is how Part B keeps the View menu open.
- Root menus in one player container form a popup group: opening one closes the other (docs).
- `TimeSlider.Markers` exists but draws the cues of a text track; our markers are a prop, so it is not used (as in step 5).
- `usePlayer(selectVolume)`: `muted`, `mutedAvailability`, `setMuted(muted)` (`docs/reference/api/feature-volume.md`), used for the Mute item in the settings menu.

### How it is built

- **Tiers:** `Tier = 'viewer' | 'studio'`. `src/pro/review/` became `src/pro/studio/` (the old empty `studio/` module is gone); one lazy `studio-*.js` chunk and one `studio-*.css`. `resolveFeatures('share' | 'review')` warns and falls back to Viewer, like any unknown tier.
- **Main row:** rendered by the Viewer skin as a three-column grid (`minmax(max-content, 1fr) auto minmax(max-content, 1fr)`) with slots `time`, `transport-start`, `transport-end`, `range`, `range-narrow`, `tools`; the Studio module portals into them. The side columns share the free space, so the transport is centred; when there is no room for that the sides keep their content width and the transport moves off-centre, not off-screen.
- **Narrow arrangement** changes the order of the controls, so the module measures the container and writes `data-dock-size="narrow" | "wide"` (`isNarrowDock`, tested); everything else is container queries.
- **Markers in the settings menu (narrow):** the settings menu lives in the Viewer chunk and menu parts need the menu's React context, so a portal would not work. The Studio module hands a ready element (`MarkersSubmenu`, props only) to the skin through the slots context (`useSetProSettingsItems`), and `SettingsMenu` renders it inside its own tree. Mute is a plain item of the Viewer skin, shown by CSS on the narrow dock only.
- **Timeline:** 46 px (22 px ruler, 2 px gap, 16 px track, buffered line at 41 px); 40 px in compact density. No accent fill without a range: the track is neutral and the white playhead carries the position.
- **Ruler labels and the playhead's head:** labels are painted above the head with `mix-blend-mode: difference`. `--pro-ruler-label` (#B8B8C0) is chosen so the blended colour on the dock equals `--pro-text-dim`; where the white head passes under a label the text turns dark (10.2:1), so the label stays readable and the head stays whole. Forced-colours mode switches the blending off.
- **Handles:** always rendered. Value = the point, or the track's own end while the point is `null`. The store now treats In at 0 and Out at the duration as "not set" (`null`), after its swap and reject rules. On top of that the handle logic treats In on frame 0 and Out on the last frame as unset (`isAtOwnEnd`), which is the brief's "within one frame". `I` on the first frame or `O` on the last does the same and says "In is at the start already" / "Out is at the end already".
- **Magnets:** `handleDragTime` pulls a dragged handle onto the playhead or a marker when it is within 5 px (the nearest wins), and rounds to that frame. The magnet list is read once, at pointer-down.
- **Loop** is on or off. `loopMode` still says what loops (`'range'` or `'whole'`) and the store keeps it in step as points come and go. The whole video loops from the `ended` event. Clearing the range no longer switches Loop off.
- **Selected marker:** `deselectMarker()` in the store; the Studio module calls it when the frame changes to anything but the marker's frame, ignoring frame changes while a seek is running.
- **Chapters** are read with their titles (`useChapters`) for the Markers menu; a chapter start that appears in two tracks (the stream's own and the host's `<track>`) is listed once.

### Decisions, and where I chose differently from the brief or the mockups

- **Breakpoints (the brief's cannot hold).** Measured, the full main row (timecode, "of", transport, Loop, Reset, three menu buttons with badges and chevrons, divider, captions, settings, mute, slider, fullscreen, gaps, padding) needs about 1034 px, and about 640 px after shedding everything the brief lists. So: volume slider under **1040** (not 900), "of duration" under 980, captions under 880, chevrons and a narrower timecode field under 840, count badges and the divider under 740; **narrow under 640** (not 560). Between 560 and 640 the one-row arrangement would overlap (seen in a screenshot at 608 px: Reset range sat on the Markers button).
- **Touch is always narrow** (the brief: "below 560 px, or `(pointer: coarse)`"), also on a wide tablet, where the two rows are spread across the width.
- **Picture-in-picture** has no button in the Studio row (the mockup and 6.7 list none): it is an item of the settings menu at every width. The Viewer keeps its PiP button.
- **Viewer volume:** the mockup shows only a mute button. The slider is still there, 0 px wide, and slides out when the pointer is over the volume control or focus is inside it (it stays in the tab order). Reason: volume is one of the gate's essential controls. On touch it stays closed.
- **Viewer layout:** always the seek bar on its own row (the old one-row wide layout is gone, with `useStacked`). Tab order is now Seek, Play, Mute, Volume, time toggle, Captions, Settings, PiP, Fullscreen. 40 px targets. White fill and a 12 px round white thumb; no accent.
- **Viewer scrim:** full strength under the button row and most of the seek bar, then a longer fade than before (the mockup's is a plain gradient to zero, which leaves the bar's top on bare footage).
- **Markers menu** also appears when there are chapters but no markers (named "Chapters"). The badge counts markers only.
- **View button (Part A):** present, `aria-disabled`, "View. Coming next".
- **320 px:** In, Out, Loop take a row of their own and the four menu buttons the next (three rows), because seven 40 px targets do not fit in 264 px. Step buttons are 40x44 on the narrow dock; everything else 44x44. The cut buttons step aside under 350 px (as in 5b).
- **Focus ring of a handle** is drawn around its 9 px tab, not its 24 px target: at the ends of the track the target reaches into the dock padding and a ring around it was clipped by the player's edge.
- **Reset range** hands focus to Loop when it removes itself.
- `Narrow.dc.html` was not in `design/mockups/` (deleted in the working tree); the narrow layout was built from `Studio, narrow.png`.
- Icons: kept; added a bookmark. Reset range uses the existing close icon, checks the existing check icon. Removed unused ones (mark in/out, play range, clear range, copy image, link, poster, more).

### Contrast (new or changed rows; `node scripts/contrast.mjs`, all pass)

| Pair | Ratio | Minimum |
| --- | --- | --- |
| playhead (text) over the unplayed band | 3.82:1 | 3 |
| playhead (text) over the played band (accent): its dark outline is what shows there | 2.44:1 (outline 7.08:1) | 3 for the outline |
| playhead over the neutral track | 12.45:1 | 3 |
| active handle (accent) against the dock / the neutral track | 6.11:1 / 5.11:1 | 3 |
| active handle against the unplayed band (same hue family; the handle stands 4 px proud of the track) | 1.57:1 | decorative |
| **idle handle (`--pro-handle-idle` #77777E) against the dock / the neutral track** | **3.74:1 / 3.13:1** | 3 |
| ruler label, blended, on the dock | 5.95:1 | 4.5 |
| ruler label, blended, over the white playhead head | 10.24:1 | 4.5 |
| hover hairline (text at 45%) over the track / the dock | 3.79:1 / 4.07:1 | 3 |
| Viewer progress fill (white) against the unfilled track | 3.28:1 | 3 |
| Viewer fill and thumb on the scrim over a white frame | 12.66:1 | 3 |
| text on a highlighted Studio menu item (`--pro-on`) | 8.39:1 | 4.5 |
| dim-raised text on that highlight: 4.45:1, so hints take the text colour on a highlighted item | - | - |
| Loop on (`--pro-on`) against the dock: 1.77:1 alone, so it keeps the short bar in the text colour (8.39:1) | - | 3 for the bar |

### Checks (headless Google Chrome via Playwright, 2x; local production build unless noted)

| Check | Result |
| --- | --- |
| Unit tests | 119 passing. New or rewritten: tiers (no `share`/`review`), unset semantics, loop follows the range, no `toolsOpen`, magnets, `isAtOwnEnd`, handle keys from unset, one pin per marker, `end` spans, 250 markers, narrow rule |
| 1440x900 | Stage 720 px, dock 117 px, timeline 46 px; the page does not scroll |
| 1100x800, 800x800, 700, 680 | One row, no overflow |
| 390x800, 320x700 | Narrow arrangement, no horizontal overflow |
| Tab order (Studio, no range) | Seek, In point, Out point, Time in seconds, Previous cut, Step back, Play, Step forward, Next cut, Loop, Markers, Capture, View, Captions, Settings, Mute, Volume, Fullscreen. Reset range sits after Loop when a range is set |
| `I`, `O` | "In point set at 00:00:20:00", "Out point set at 00:00:50:00"; Reset range appears |
| Handle keys | `→` then `Shift+→`: In 00:00:20:11. `Home` on In: "Start", "In point cleared". `→` from unset: 00:00:00:01. `Delete` on Out: "End". `←` on an unset Out: one frame before the last. `Shift+I`, `Shift+O`: "Range reset", Reset range gone |
| Mouse drag | In handle dragged to 25%: bubble 00:00:27:23, committed on release, "In point set at…". Out handle dragged from its idle end to 60%: 00:01:06:20 |
| Magnets | In dragged to 3 px from the playhead (00:00:50:00) landed on 00:00:50:00; to 4 px from the 34 s marker landed on 00:00:34:00. Whether it *feels* right needs a hand on a mouse |
| Unset by pointer | Dragging In past the start: "Range reset". Double-click on a handle unsets it |
| Marker pin | Hover: "Logo too small 00:00:08:12"; click seeks to frame 252 and selects it (accent); stepping one frame drops the selection |
| Markers menu (keyboard) | `aria-haspopup="menu"`, `aria-expanded` false→true, focus moves to the first item, arrow keys move the highlight, Escape closes and focus returns to the button. Lists 7 markers and the chapters; Enter on an item seeks and focus returns |
| Capture menu (keyboard) | Same behaviour; items Grab frame (G), Copy frame image, Copy link at timecode, Use frame as poster |
| Loop with no range | "Loop on: the whole video"; playing from 110.6 s wrapped to the start and kept playing |
| Touch emulation (Chrome, `hasTouch`, coarse pointer, CDP touch events, 390 px) | Narrow layout; targets 44x44 (step and cut 40x44); handle target 44x44; dragging the Out handle diagonally moved it and the page (made 2400 px tall) did not scroll; scrubbing the track seeks; In button sets In at the playhead; settings lists Mute and Markers |
| Viewer gate (keyboard only, 1440 and 320) | Tab order as above; `K`/`Space`, `←` `→` 5 s, `J` `L` 10 s, `5`, `Home`, `M`, `↓`, `C`, `Shift+?` (11 rows, focus in, `Esc`, focus back). Free keys (`I O , . [ ] R G Shift+←/→ Shift+V`) do nothing. No overflow at 320 px. Volume slider opens on focus (64 px) |
| Viewer loads no pro code | No `runtime-*`, `studio-*` or `debug-*` request in Viewer; Studio requests `runtime-*.js`, `studio-*.js`, `studio-*.css` |

### Chunk sizes (raw / gzip -9)

| Chunk | Step 5b | Step 6a |
| --- | --- | --- |
| Viewer path JS (`preview-*.js`) | 967,713 / 284,710 B | 968,072 / 284,726 B (+359 B raw) |
| Skin CSS (with the preview page's) | 34.6 kB / 6.4 kB | 36.2 kB / 6.6 kB |
| Pro runtime | 8.55 kB / 3.55 kB | 8.50 kB / 3.57 kB |
| Studio JS (was `review-*.js`) | 40.2 kB / 13.35 kB | 37.4 kB / 12.3 kB |
| Studio CSS | 22.0 kB / 3.8 kB | 19.3 kB / 3.5 kB |

(Step 5b's notes gave 285.6 kB gzip for the Viewer JS; that was Vite's figure, which reads about 4 kB higher than `gzip -9`. Both builds were measured the same way here.)

### Removed

The Tools tray, the Tools disclosure button, group labels, the range readout, Play range (and its loop-engine branch), `toolsOpen`/`setToolsOpen`, the playhead bubble, the marker lane, cluster badges and their layout, the open-range fade, the accent progress fill, `dock-logic.ts` (`chooseDockSize`, `toolsSummary`), `formatRangeLength`, `use-stacked.ts`, the Viewer's one-row layout, eight unused icons, and the tests of all of these.

### Screenshots

`design/screenshots/step-6/`, headless Google Chrome at 2x as before, each opened and looked at: Studio with and without a range and Viewer at 1440, 1100, 800, 390 and 320; Studio at 680, 700, 760, 860, 900, 1000; the hover bubble; Markers and Capture menus at 1440, Capture at 390; focus rings on the In handle, an idle Out handle, the Markers and Capture buttons; compact density; touch emulation at 390; the Viewer's volume slider open.

## Step 6, Part B: View menu and guides (15 Nov 2026)

### Verified APIs

- `Menu.CheckboxItem (checked, onCheckedChange)`: `role="menuitemcheckbox"`, `aria-checked`, and it does **not** close the menu (source: no `completeMenuItemSelection`). Space and Enter toggle it (tested).
- `Menu.RadioGroup (value, onValueChange)` / `Menu.RadioItem (value)`: `role="menuitemradio"`. A radio item closes the menu after selecting, so each item has an `onClick` that does the selection itself and calls `preventDefault()`, which the item checks before its own select-and-close (source: `radio-item.js`). The same trick keeps the footer `Menu.Item` open.
- `Menu.Group` / `Menu.GroupLabel` / `Menu.Separator` for the sections. The two column wrappers are plain `role="none"` elements inside `Menu.Content`.
- **Observed, not documented:** when the menu opens by keyboard, focus goes to the first *checked radio* item (Crop: None) rather than the first item (Title safe). Arrow keys reach everything from there and wrap. Not changed.
- `useHotkey({ keys: 'Shift+v' })` matches Shift alone and is skipped in text fields, like the other pro keys.

### Safe areas: numbers and sources (verified)

Action safe is the central 93% of width and height (a 3.5% margin on each side) and title safe the central 90% (5% on each side): **EBU R95** ("Safe areas for 16:9 television production", the "graphics safe area") and the matching table in **ITU-R BT.1848**. The menu's dim sub-line reads "Broadcast, 90%" / "Broadcast, 93%". These equal the brief's proposal; nothing changed. The older 80%/90% "title/action safe" pair that editing software still offers is the SD-era convention and is not used.

Sources: https://tech.ebu.ch/docs/r/r095.pdf, https://www.itu.int/dms_pubrec/itu-r/rec/bt/R-REC-BT.1848-1-201510-I!!PDF-E.pdf (found by search; the PDFs themselves were not opened, the figures come from the search summaries of them).

### Platform zones: numbers and sources (**not verified against the platforms' own files**)

None of the three platforms publishes one fixed set of pixel margins as text: each offers a downloadable safe-zone template or an in-product overlay, the zone depends on caption length and on organic versus ad placement, and I could not open the templates. The numbers used are from secondary sites that say they are quoting those templates. Percent of a 1080x1920 frame:

| Platform | Top | Bottom | Right rail | Where from | Status |
| --- | --- | --- | --- | --- | --- |
| YouTube Shorts | 0–15% (288 px) | 65–100% (672 px) | right 18% (192 px), drawn from 36% to 65% of the height | socialync.io and adkit.so safe-zone tools, which point at Google's "Use square and vertical video" help article (support.google.com/google-ads/answer/9128498); that page shows a diagram whose numbers did not come through in text | Secondary source. The rail's vertical extent is my estimate |
| Instagram Reels | 0–14% | 65–100% (35%) | right 12%, from 38% to 65% | 14% / 35% / 6% is repeated consistently (socialync.io, lilachbullock.com, adkit.so) and attributed to Meta's ads guide. The 6% is a side margin; the button column is wider, and 12% is the brief's proposal | Top and bottom from secondary sources; the rail is an estimate |
| TikTok | 0–8% (154 px) | 78–100% (422 px) | right 16% (173 px), from 38% to 78% | Sources **disagree**: top 154, 160 or 240 px; bottom 422, 480 or 660 px; right 120 to 173 px (manypixels.co, relevantaudience.com and others). I took the smallest reserved areas; TikTok's own answer is a template per caption length | Unverified |

So the brief's proposed defaults were replaced for Shorts and Reels (bigger bottom bands: 35%, not 20% and 28%) and kept in spirit for TikTok. Every platform item says "Approximate", the menu carries a note ("Apps change their layouts: check the platform's current guidance"), the announcement says "approximate", and the README says the same. **The author should overlay each platform's current template once and correct `src/pro/studio/guides/platform-zones.ts`**; it is the only file to edit.

### How the picture rectangle is computed and kept current

- `pictureRect(stageW, stageH, videoW, videoH, fit)` in `src/pro/studio/guides/geometry.ts` (pure, tested): for `contain` the largest centred rectangle with the ratio `videoWidth / videoHeight`. It also handles `fill`, `cover` (the rectangle is then larger than the stage), `none` and `scale-down`; the mode is read from the video element's computed `object-fit`. `object-position` is taken as centred.
- `usePictureRect` measures the `<video>` element's own box (so any CSS on it is respected), places the result relative to the overlay layer's parent, rounds the edges to device pixels, and writes `--pro-picture-x/y/w/h` on the container. The Viewer skin's `.pro-overlay` rule uses those variables (falling back to the whole parent), so the overlay layer **is** the picture and guides are drawn in its coordinates. The host's `overlay` slot is positioned the same way in Studio.
- Recomputed on: a `ResizeObserver` on the video element and on the stage (covers window resizes, density changes, the dock changing height, entering and leaving fullscreen), the media's `loadedmetadata`, `resize` and `emptied` (a new source, a rendition of another shape), `fullscreenchange`, and window `resize`. Before metadata there is no rectangle and nothing is drawn.
- No workaround was needed. **Pixel aspect ratio is ignored**: `videoWidth / videoHeight` is taken as the display ratio (browsers report anamorphic sources already scaled). Rotation metadata likewise.

### How the guides are drawn

- One `<svg>` per guide (`data-guide="title-safe"`, `"9:16"`, `"zones-tiktok"`…), each the size of the picture, with user units equal to CSS pixels and coordinates on device-pixel centres (`crisp`, `crispRect`), `shape-rendering: crispEdges`.
- **Every line is drawn twice:** a 3 px stroke of black at 50%, then a 1 px white stroke at 75% on top. Over white the dark edge shows; over black the white line shows. Dashed for safe areas and zones, solid for thirds, the centre cross and the crop's edge. No accent.
- Crop: the outside is filled `rgb(0 0 0 / .55)`; when the picture already has the ratio only the outline is drawn (`cropMask(...).full`). Zones: `rgb(0 0 0 / .35)` plus the dashed outline.
- Labels are HTML pills (10.5 px, `--pro-text` on `rgb(14 14 16 / .72)`), hidden under a 480 px wide picture. Title safe's label sits inside its top-left corner; Action safe's sits **on** its top edge, because the gap between the two rectangles (1.5% of the height) is too small for a label. The rail's label sits to its left.
- The centre cross is 5% of the picture height tip to tip, at least 8 px.

### View state, persistence, events

- `src/pro/view.ts` (pure, in the runtime chunk): `ViewState { guides, crop, zones, hidden }`, `allowedView(features)`, the reducers (`toggleGuide`, `setCrop`, `setZones`, `toggleHidden`), `viewMenuModel`, `activeCount`, `viewAttributes`, `serializeView`, `parseStored`. The store's old `activeOverlays` set is replaced by `view`.
- **Zones and the 9:16 crop:** a zone always carries crop `9:16`, also when the host's guide list does not offer 9:16 as a crop (zones need the frame); choosing another crop, or None, clears the zone ("Crop 1:1. Platform zones off"). Setting zones to None keeps the 9:16 crop only if the host offers it.
- **Badge:** checkbox guides, plus one for a crop; a zone with its frame counts as one. Hidden counts as zero.
- **Hide/Show** keeps the set and flips `hidden`. Any choice made while hidden shows the guides again. `hidden` is not persisted: a reload shows the remembered set.
- **Persistence:** one key (`videojs-pro:v1` or the host's), JSON `{ v: 1, guides, crop, zones, timeDisplay }`, read synchronously in the store's initialiser (in `ProRuntime`'s `useState`), so the first render already has it; there is no visible flash because guides wait for the picture rectangle anyway. Written on every change of `view` or `timeDisplay`. Every access is in `try/catch`. **Storage can come back empty, blocked or holding anything, and nothing depends on it.**
- A remembered value the host does not allow is dropped on read, but the stored string is only rewritten at the next change. So a user who visits a restricted player and changes nothing keeps their fuller set for other players on the same origin.
- `onViewChange({ guides, crop, zones })` reports the *drawn* set (empty while hidden), fires when it changes, and not for the starting set.
- Container attributes: `data-guide-<id>` for each drawn guide **and for the crop** (`data-guide-9-16`), plus `data-crop="9-16"` and `data-zones="tiktok"`.
- The preview page reads `?guides=…` and `?zones=0` so the host side can be exercised.

### `Shift+V`

No conflict: `V` is not in the YouTube map or ours, the pattern needs Shift alone, and it does nothing in the Viewer tier (checked with the other free keys). With nothing switched on it says "No guides are on". It is listed in the help dialog.

### Checks (headless Google Chrome via Playwright, 2x)

| Check | Result |
| --- | --- |
| Unit tests | 168 passing (49 new: view model, menu model for different `features`, radio sections hold one value, zone sets crop 9:16, another crop clears it, hide and restore, badge count, attributes, serialise and parse with invalid JSON, unknown ids, disallowed ids and wrong types, storage key; picture rectangle in six shapes and five fit modes, safe areas, thirds, cross, crop masks, platform zone tables, crisp lines; store view actions and `onViewChange`) |
| Menu roles | 4 `menuitemcheckbox`, 6 + 4 `menuitemradio`, 1 `menuitem`; `aria-checked` follows the state |
| Keyboard | Enter opens; Space and Enter toggle and the menu stays open; arrows move through both columns; Escape closes and focus returns to the View button; Tab closes it and focus moves on to Captions |
| Announcements | "Crop 2.39:1", "Rule of thirds on", "Platform zones: TikTok, approximate. Crop 9:16", "Guides hidden", "Guides shown" (one live region) |
| `Shift+V` | Attributes and SVGs go and come back; the badge reads 0 while hidden |
| Zone and crop | Choosing TikTok set `data-crop="9-16"` and `data-zones="tiktok"`; the Crop radio shows 9:16 |
| Guides on the picture | 16:9 stage: overlay 0,0 1280x720. Stage 1:1 (letterbox): overlay 0,186.5 852x479.5. Stage 21:9 (pillarbox): overlay 152.5,0 975x548.5. Looked at in screenshots |
| White, black, mid-grey | All guides plus the 2.39 crop over a pure white, pure black and #808080 frame: every line and label legible (screenshots) |
| Remembered | A stored set with seconds display came back after a reload, with no guide flash seen in the first screenshot |
| Host wins | `?guides=title-safe,1:1&zones=0` with a fuller remembered set: only Title safe drawn; menu offers Title safe, None, 1:1. `?guides=0`: no View button, nothing drawn |
| Bad storage | Invalid JSON, an array, unknown ids and wrong types: the player loads, nothing or only the valid id is applied, no error |
| Blocked storage | `localStorage` made to throw: no page error; guides still toggle |
| `onViewChange` | Logged for thirds on, Reels (with crop 9:16), and hide (empty set) |
| Help dialog | Lists `Shift V` "Hide or show the guides" |
| Narrow (390 px) | The menu is one column and scrolls inside the player |

### Chunk sizes (raw / gzip -9)

| Chunk | Step 6a | Step 6b |
| --- | --- | --- |
| Viewer path JS | 968,072 / 284,726 B | 968,226 / 284,770 B (+154 B: the preview page's `?guides` reader and one more event handler) |
| Skin CSS (with the preview page's) | 36.2 kB / 6.6 kB | 36.3 kB / 6.6 kB |
| Pro runtime | 8.5 kB / 3.6 kB | 12.4 kB / 4.9 kB (the view model and persistence) |
| Studio JS | 37.4 kB / 12.3 kB | 48.8 kB / 15.8 kB |
| Studio CSS | 19.3 kB / 3.5 kB | 22.1 kB / 4.0 kB |

### For step 7

- **The Image section goes into `ViewMenu`'s `extra` prop** (`src/pro/studio/view-menu.tsx`): it is rendered under Platform zones in the right column, inside the same `Menu.Content`, so `Menu.RadioGroup`/`Menu.RadioItem` work there. Use the `onClick` + `preventDefault` pattern to keep the menu open.
- **The image tools should use the picture rectangle**: `usePictureRect` returns `{ rect, layer }` and publishes `--pro-picture-*`. Zoom and pan are the risk: the hook measures the video element's box and re-measures on `ResizeObserver`, which does **not** fire for a CSS `transform`. If zoom transforms the video, the guides will not follow unless the transform is put on a wrapper that holds both the video and the overlay layer, or the hook is told to re-measure. Decide first whether guides should zoom with the picture (probably yes).
- Channel and gain/gamma filters on the video do not affect the overlay layer (it is a sibling), which is what we want: guides stay white.
- The store still has `inspection` (channel, gain, gamma, zoom) from step 3, unused. `infoHud`, `channels`, `gainGamma`, `zoom` are on in Studio with no UI.
- The badge counts guides only; decide whether an active image tool counts.
- Persistence: add fields to `serializeView`/`parseStored` (and bump nothing: unknown fields are ignored, missing ones default).
- Grab frame draws the raw video, so guides and image adjustments are never in the PNG; say so in the Image section if that surprises.

### Screenshots

`design/screenshots/step-6/` (same method): the View menu at 1440 and 390; each guide on its own; all four together; each crop; each platform's zones; all guides plus the 2.39 crop over white, black and mid-grey; TikTok zones over white; letterboxed and pillarboxed pictures; guides at 1100, 800, 390 and 320; the focus ring on the View button.

## Deployed URL

- https://videojs-pro.vercel.app (Vercel production, project `videojs-pro`). Deploy: `npm run deploy vercel`. The monitor page: `/preview.html` (opens in Studio; `?tier=viewer`, `?density=compact`, `?layout=dock|overlay`, `?debug`).
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
- Step 2: AirPlay and Cast buttons, the title and the centre seek buttons were removed. They are not in the Viewer control list.
- Step 2: no `@scope` and no CSS nesting, to hold the browser floor. `:dir(rtl)` has an attribute fallback for Chrome 111–119.
- Step 2: the mono font was JetBrains Mono 500. **Removed in step 5** (5b.2): the skin uses the system UI stack only.
- Step 2: icons are our own drawings (no base set), in `src/video/icons/`.
- Step 2: the skin's own strings are in `src/video/strings.ts` (English only). Video.js control labels come from Video.js i18n and do follow the locale.
- Only `@videojs/*` packages are pinned exactly. The other dependencies keep the scaffold's caret ranges, locked by the lockfile.

## Later

- A `layout="overlay"` Studio bar still covers a small player; consider a compact overlay variant if a host needs it.
- Give `ProSkin` a title for grabbed file names (`<title>_<timecode>.png`).
- Stop the Out frame flashing at the loop point (jump one frame earlier) if it bothers in use.
- Translate the Studio strings (`src/pro/studio/strings.ts`).
- Overlay each platform's current safe-zone template and correct `platform-zones.ts` (step 6b used secondary sources).
- Open the View menu on its first item rather than on the first checked radio item, if Video.js gains a way to say so.
- Measure the Viewer skin's own weight against a stock Video.js skin.
- Redraw the settings icon: it reads a little like a sun.
- AirPlay and Cast buttons (removed in step 2), with custom icons.
- Translate `src/video/strings.ts` through Video.js i18n (`Text` tokens) so the help dialog follows the locale.
- Soften the top edge of the control-bar scrim.

- Code-split the preview bundle: `preview-*.js` is 972 kB minified, and Vite warns about it. Check whether the Viewer tier stays "as light as a stock skin" in step 2.
- Tailwind, Base UI and Heroicons are devDependencies of the workbench shell only. The skin itself is plain CSS; keep it that way.
- Consider pinning the non-Video.js dependencies exactly before submission.
- Update the deploy script's `vercel@64` if Vercel 64 causes problems; 65 is current.

## Unverified

- **Step 6b: the platform zone numbers.** Secondary sources only; TikTok's sources disagree. See "Platform zones: numbers and sources".
- **Step 6b: the EBU and ITU documents** were not opened; the 3.5% and 5% margins come from search summaries of them.
- **Step 6b: guides in real fullscreen.** Headless Chrome refuses fullscreen. The rectangle is recomputed on `fullscreenchange` and by the `ResizeObserver`; the letterboxed and pillarboxed stages are the same code path.
- **Step 6b: a 9:16 or 1:1 source.** The demo stream is 16:9; other picture shapes were covered by the unit tests and by changing the stage's ratio, not by another video.
- **Step 6b: `object-fit` other than `contain`** is unit-tested only.
- **Step 6b: Firefox and Safari** (SVG `vector-effect`, `shape-rendering`, the menu's two-column layout).
- **Step 6b: screen reader.** Roles, checked states and announcements were read from the DOM.
- **Step 6b: a no-flash guarantee.** The remembered set is in the first render by construction; I saw no flash in screenshots but did not record frames.

- **Step 6a: real fullscreen with the new dock.** Headless Chrome still refuses fullscreen; the layout is the same flex column as in 5b.
- **Step 6a: how the magnetic snap feels**, and dragging in general, with a real mouse or finger. Positions were checked from script.
- **Step 6a: Firefox and Safari.** `mix-blend-mode: difference` on the ruler labels, `:has()`, `color-mix()` and container queries are inside the browser floor on paper; only Chrome was run.
- **Step 6a: a real touch device.** Touch was emulated in Chrome. On a wide tablet the narrow arrangement is used (as the brief asks) and was not looked at.
- **Step 6a: Copy frame image, Copy link, Use frame as poster from the new Capture menu** were not pressed in this run; the actions are the step 4 ones, unchanged.
- **Step 6a: menu type-ahead, `Home`/`End` in a menu.** Documented by Video.js, not tried.
- **Step 6a: screen reader.** Names, roles, values and the live region's text were read from the DOM, not heard.
- **Step 6a: a source without chapters and with markers** (the Markers menu without the Chapters heading, `[` `]` on markers) was not run in the browser; unit-tested.

- **Step 5b: real fullscreen with the dock.** Headless Chrome refuses fullscreen. Verified instead: the documented fullscreen target and the fixed-height layout.
- **Step 5b: Firefox, Safari, Windows and Android fonts, a real phone.** Chrome on macOS only; touch was emulated.
- **Step 5b: captions over the picture in the dock layout** were not looked at.
- **Step 5b: the fullscreen `:fullscreen .pro-stage` rule** (stage fills the screen) is untested for the same reason.
- **Step 5: Firefox and Safari.** Only Chrome was run. `:has()` (hides the seek preview over a marker), `color-mix()` and `mask-image` are inside the browser floor on paper, not tested.
- **Step 5: a real touch device.** Touch was emulated in Chrome.
- **Step 5: `onCopyLink` and `onPosterFrame` in the event log** were not pressed in the step 5 run (checked in step 5b).
- **Step 5: the one-hour case** used an overridden `duration` on the element, not a real one-hour file.
- **Step 5: screen reader.** Names, values and announcements were read from the DOM, not heard.
- **Step 4: nothing was looked at.** The Chrome window was hidden for the whole step (0×0 viewport, screenshots timed out), so the Studio bar's appearance, the new icons, the wrapping and breakpoints, focus rings, tooltips and the toast were never seen. Behaviour was tested through page scripts. This needs a visual pass before step 5.
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
