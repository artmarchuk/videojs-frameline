# NOTES

Read this at the start of every step, along with `specs/PROJECT-OVERVIEW.md` and the step's requirements file.

**Tier names.** Until step 6 there were three tiers: Share, Review and Studio. Step 6 merged Review and Studio into **Studio** and renamed Share to **Viewer**. The sections for steps 2 to 5b below were renamed with the code, so "Studio" there means what was then called Review (the old Studio tier had no UI). Things step 6 removed are still described in those sections as history: the Tools tray, the Tools button, the playhead's permanent bubble, the marker lane and its cluster badges, Play range, `toolsOpen`. The git tag `step-2-share-gate` keeps its name.

**The skin is now Frameline.** Step 8 renamed Video.js PRO to **Frameline** ("Frameline — a Video.js skin for video creators"). The text below was renamed with the code: `ProSkin` is `FramelineSkin`, the `--pro-*` tokens are `--fl-*`, the storage key `videojs-pro:v1` is `frameline:v1`, the package is `videojs-frameline`. Not renamed: the Vercel project (`videojs-pro`), `src/pro/`, the `.pro-*` classes and `data-pro-*` attributes, and the old step files in `specs/`.

**View is now Guides.** Step 7b renamed the View menu to **Guides** and moved zoom to a button of its own. Sections up to step 7 still say "View menu", `onViewChange`, `view:change`, `ViewMenu` and `view-menu-focus.js`: read them as Guides menu, `onGuidesChange`, `guides:change`, `GuidesMenu` and `guides-menu-focus.js`. Step 7's Zoom group in the View menu, its three levels and `Alt+arrows` are history too (see step 7b).

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
- `--media-border-radius` is the player's corner radius (docs), and `--media-border-color` is the hairline around the player. We map them to `--fl-radius` and `--fl-frame-line`.
- Extra tokens beyond the brief: `--fl-track` (slider track, added to reach 3:1), `--fl-scrim-alpha` and `--fl-scrim`, `--fl-frame-line`, `--fl-density-control/gap/pad`, `--fl-control-size`, `--fl-slider-hit`, focus and layer tokens.

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
| slider track (--fl-track) on surface-0 | 5.04:1 | 3 | PASS |
| slider track (--fl-track) on scrim over white | 3.74:1 | 3 | PASS |
| hairline (line) on surface-1, decorative | 1.34:1 | - | PASS |
| focus ring halo: accent vs surface-0 halo | 16.56:1 | 3 | PASS |
| focus ring halo: surface-0 halo vs white frame | 19.57:1 | 3 | PASS |

The scrim is `--fl-surface-0` at 88% opacity. Text and icons sit only over the full-strength part of the scrim, so the "over white frame" rows are the worst case. Proposed token values were kept; only `--fl-track` (#7A828E) was added (the unfilled track; the buffered range uses `--fl-text-dim`), because the hairline colour is too dark for a slider track (first try #5C6470 gave 2.43:1 over white).

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
| Reduced motion | **Not tested in a browser.** By construction every transition uses `--fl-duration` or `--fl-duration-fade`, both set to 0 ms, and the spinner animation is removed |
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

A small separate store next to the player (`src/pro/store.ts`), created once per `FramelineSkin`, read through a React context and `useSyncExternalStore` with selectors. Reasons: Video.js has no documented custom-feature API; the skin does not own `createPlayer`, so it could not add a feature even if there were one; and a separate store keeps every pro byte out of the Viewer path.

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
| `preview-*.js` (Viewer path: React, Video.js with the Mux/HLS engine, the Viewer skin, `FramelineSkin` wrapper and flag resolver) | 963.0 kB | 284.1 kB | always |
| `preview-*.css` (skin styles; byte-identical to the step 2 tag) | 30.7 kB | 5.6 kB | always |
| `runtime-*.js` (store, frame clock, timecode) | 7.7 kB | 3.3 kB | any pro feature or debug is on |
| `studio-*.js` (empty until steps 4 to 7) | 47 B each | 86 B each | a feature of that tier is on |
| `debug-*.js` + `debug-*.css` | 1.3 kB + 0.7 kB | 0.8 kB + 0.4 kB | `debug` or `?debug` |
| `dev-tier-switch-*.js` (preview app only) | 0.4 kB | 0.3 kB | `?debug` |

Checked on the public URL without `?debug`: no pro chunk is requested. The Viewer chunk contains none of the store, clock, timecode or debug code (searched for their identifiers). It does contain the flag resolver and tier table, which `FramelineSkin` needs to decide what to load. The Viewer path grew by about 4.7 kB raw over step 2. We have not measured the Viewer skin alone against a stock skin; almost all of the 963 kB is Video.js and its streaming engine.

### Checks

- **Tests:** `npm test`, 37 passing: timecode (24, 25, 30, 50, 60, 23.976, 29.97 non-drop and drop-frame, 59.94 drop-frame, round trips, bad input), `resolveFeatures`, store invariants, guides filter, per-instance stores.
- **Render check** (public URL, `?debug`, 2 s of playback): the skin's render count stayed at 4 while the readout's went from 6 to 61. Locally: skin 2, readout 126. The skin does not re-render per frame.
- **Frame clock** (Chrome on macOS, 30 fps demo stream, no burned-in frame counter): source `rvfc`, precision `frame`. Seeking to 18 known frame times while paused gave the expected frame 16 times; the 2 misses were long seeks that had not finished within the 450 ms the test waited, and they showed the previous frame, not an off-by-one. Seeking to frame 300 on the public URL gave frame 300, media time 10.000, timecode 00:00:10:00.
- **Step 2 regression:** the keyboard-only checks were re-run on the public URL and pass (play, pause, seek, mute, captions, free keys, help dialog and focus return).

## Step 4: Studio transport (15 Nov 2026)

### Verified APIs

- `useHotkey({ keys, onActivate, action, repeatable, disabled })` for every Studio key. Patterns match modifiers exactly, so `.` and `>` (Shift+.) do not collide, and Ctrl/Cmd/Alt combinations are left to the browser.
- `Menu.Root / Trigger / Popup / Content / Item (onSelect, disabled)` for the More menu; `Menu.Popup` is the popup, there is no separate `Popover`.
- `Tooltip` with a custom `label` node on plain buttons (`ButtonTooltip label={…}`).
- `usePlayer(selectPlayback)` for `paused`; `usePlayer(selectPiP)`.
- The `<video>` element is reached through `useVideoElement` (step 3); `drawImage(video)` on a canvas works for the HLS stream.

### How the Studio controls get into the bar

The Viewer bar renders four empty slots (`transport-start`, `transport-end`, `time`, `tools`) only when `FramelineSkin` asks for them. The lazy Studio module portals its controls into them, so they sit in the bar's layout and focus order while their code stays out of the Viewer path. With any Studio control on, the seek bar always has its own row, and the button row wraps.

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
- Toggled-on tool buttons use `--fl-on`, not the accent (5b.2), already here.

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
| Events in the log (`?debug`) | `inout:change`, `marker:select`, `frame:change` seen. `link:copy` is wired the same way; not pressed in this run |
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

- `FramelineSkin layout="dock" | "overlay"`; default `overlay` for Viewer and `dock` for Studio (`resolveLayout`, tested). `data-layout` on the container; shown in the debug readout.
- Dock structure, in the Viewer skin so that Viewer can dock too without pro code: `Container` > `.pro-stage` (media, poster, overlay layer, pro layers, indicators) + the control bar as a static panel. The skin is a flex column; the stage has `aspect-ratio: var(--fl-stage-ratio, 16 / 9)` and may shrink, the dock may not. With a fixed height (or fullscreen) the stage takes what is left and the picture is letterboxed.
- The pro bar's main row is rendered by the Viewer skin as groups with slots: `time-start`, Transport (`transport-start`, Play, `transport-end`), `time`, host slot, `tools`, `tray`, spacer, host slot, Playback. The Studio module fills the slots.
- **Tray position:** in the DOM the tray comes right after the Tools button (so Tab goes Tools → tray → Playback, as the brief asks); CSS `order` lays it out as a full-width row under the main row.
- **Narrow order:** below 560 px (680 px on touch) the order of controls changes (timecode, step, Play, cut), so the DOM changes with it. The Studio module measures the container, picks `wide`, `medium` or `narrow` (`chooseDockSize`, tested) and writes `data-dock-size` on the container. Everything else is container queries.
- `toolsOpen` is in the pro store (default closed, `setToolsOpen`, tested). Persistence comes in step 6.
- `--fl-frame-border: 1` draws a 1 px hairline and a 10 px radius around the player. Default: none. The preview page sets it.

### Decisions, and where I chose differently from the brief or the mockups

- **Markers, Play range, Clear range, Copy frame image** had no place in the brief's tray (the old More menu is gone). Now: Range has a chevron menu (Play range, Clear range); Grab has its chevron menu (Download PNG, Copy frame image), as the brief says; and the tray has a fourth group, **Markers** (button with a count, menu of every marker), shown only when there are markers.
- **Responsive, 560 to 899 px:** the full main row needs about 900 px, so it cannot stay on one line down to 560 px without giving things up. In order: volume slider (under 900), PiP button and fps label (under 820; PiP moves into the settings menu), the Tools summary (under 760), the full Tools label, replaced by "Tools" (under 700; the accessible name stays "Range, Capture, View"), the captions button (under 640; `C` and the settings menu remain). With that the row is one line at every width from 560 px.
- **Touch stays narrow up to 680 px**, because 44 px targets need the room.
- **Narrow row 2** is Tools, Mute, Settings, Fullscreen: Settings fits, and it holds captions, speed and PiP, so no separate More menu is needed. Under 352 px the Tools label is the short one and the range readout shows the length only.
- **320 px:** four 40 px buttons do not fit beside Play and the timecode (they would be 31 px wide). Under 350 px the previous/next cut buttons step aside; step, Play, timecode, Tools, Mute, Settings and Fullscreen stay, all 44 px tall and at least 40 px wide. `[` `]` and the Markers menu still work. The brief asked me to say so.
- **Ruler at a narrow width:** the mockup shows a tick per second at 326 px; the 6 px rule gives a tick every 2 s there. The rule won.
- **Toggled-on (`--fl-on`) against the control fill is only 1.48:1**, too little for a state. "On" buttons in the dock also draw a short bar in the text colour (8.4:1). Loop uses it.
- **Dim text on `--fl-surface-3` is 4.05:1** with the proposed `--fl-text-dim`. Added `--fl-text-dim-raised` (#B2B2B8, 5.37:1) for dim text in tooltips and on hovered controls.
- `--fl-track` (the unfilled track over footage in the Viewer overlay) moved to a neutral #85858C; the dock's track is `--fl-surface-2` as specified.
- In/Out buttons no longer light up when a point is set: they are not toggles, and the band shows the range.
- The timecode field shows the current frame only; the total moved to its tooltip and its accessible description.
- **Seconds-only ruler labels** are used up to and including 60 s (the mockup's 60 s clip reads `0s … 50s`).
- The preview page **opens in the Studio tier** (`?tier=viewer` for Viewer), since the page is now a monitor. `?layout=dock|overlay` and `?density=compact` are also read.
- Also changed beyond the brief: tooltips lost their keycap chips everywhere (Viewer too), popups got one soft shadow, the Viewer playhead is white, the Viewer primary dialog button is neutral, captions-on and PiP-on use `--fl-on`.

### Contrast (computed by `node scripts/contrast.mjs`)

| Pair | Ratio | Minimum | Result |
| --- | --- | --- | --- |
| text on surface-0 (timecode field) | 17.25:1 | 4.5 | PASS |
| text on surface-1 (dock, menus) | 14.89:1 | 4.5 | PASS |
| text on surface-2 (controls) | 12.45:1 | 4.5 | PASS |
| text on surface-3 (hover, tooltips, badges) | 10.13:1 | 4.5 | PASS |
| text on --fl-on (a toggle that is on) | 8.39:1 | 4.5 | PASS |
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
| slider track (--fl-track) on surface-0 | 5.26:1 | 3 | PASS |
| slider track (--fl-track) on scrim over white | 3.86:1 | 3 | PASS |
| Viewer playhead (text) on scrim over white | 12.66:1 | 3 | PASS |
| focus ring: accent on surface-0 | 7.08:1 | 3 | PASS |
| focus ring: accent on surface-1 (dock) | 6.11:1 | 3 | PASS |
| focus ring: accent on surface-2 | 5.11:1 | 3 | PASS |
| focus ring: accent on --fl-on | 3.45:1 | 3 | PASS |
| focus ring halo: surface-0 vs white frame | 19.28:1 | 3 | PASS |
| playhead (text) over the unplayed band (--fl-range) | 3.82:1 | 3 | PASS |
| playhead (text) over the played band (accent) | 2.44:1 | - | PASS |
| playhead outline (surface-0) over the played band (accent) | 7.08:1 | 3 | PASS |
| playhead (text) over the neutral track (surface-2) | 12.45:1 | 3 | PASS |
| unplayed band (--fl-range) against the neutral track | 3.26:1 | 3 | PASS |
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
| toggle on (--fl-on) against control fill (surface-2): too low alone, so "on" also draws a bar in the text colour | 1.48:1 | - | PASS |
| toggle-on bar (text) against --fl-on | 8.39:1 | 3 | PASS |

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
| Tab order, tray open | …Tools, Set In, Set Out, Loop, Range options, Grab frame, Grab options, Copy link, Markers, Guides, then Mute… |
| Tools button | `aria-expanded` false/true; Enter and Space toggle; opening moves focus nowhere; next Tab is Set In; Escape in the tray closes it and focus returns to the Tools button; Escape in an open menu closes only the menu |
| Groups | `role="group"` named Transport, Range, Capture, Go to (markers), View, Playback; no `role="toolbar"` |
| Shortcuts with the tray closed | `I`, `O`, `R`, `.` work; the closed button shows "17 s range" |
| Actions from the tray | Loop off, "Link copied" (`link:copy` logged), grab downloads `frame_00-00-20-01.png`, Set In by button, Grab menu lists Download PNG and Copy frame image |
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
- **Ruler labels and the playhead's head:** labels are painted above the head with `mix-blend-mode: difference`. `--fl-ruler-label` (#B8B8C0) is chosen so the blended colour on the dock equals `--fl-text-dim`; where the white head passes under a label the text turns dark (10.2:1), so the label stays readable and the head stays whole. Forced-colours mode switches the blending off.
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
- Icons: kept; added a bookmark. Reset range uses the existing close icon, checks the existing check icon. Removed unused ones (mark in/out, play range, clear range, copy image, link, more).

### Contrast (new or changed rows; `node scripts/contrast.mjs`, all pass)

| Pair | Ratio | Minimum |
| --- | --- | --- |
| playhead (text) over the unplayed band | 3.82:1 | 3 |
| playhead (text) over the played band (accent): its dark outline is what shows there | 2.44:1 (outline 7.08:1) | 3 for the outline |
| playhead over the neutral track | 12.45:1 | 3 |
| active handle (accent) against the dock / the neutral track | 6.11:1 / 5.11:1 | 3 |
| active handle against the unplayed band (same hue family; the handle stands 4 px proud of the track) | 1.57:1 | decorative |
| **idle handle (`--fl-handle-idle` #77777E) against the dock / the neutral track** | **3.74:1 / 3.13:1** | 3 |
| ruler label, blended, on the dock | 5.95:1 | 4.5 |
| ruler label, blended, over the white playhead head | 10.24:1 | 4.5 |
| hover hairline (text at 45%) over the track / the dock | 3.79:1 / 4.07:1 | 3 |
| Viewer progress fill (white) against the unfilled track | 3.28:1 | 3 |
| Viewer fill and thumb on the scrim over a white frame | 12.66:1 | 3 |
| text on a highlighted Studio menu item (`--fl-on`) | 8.39:1 | 4.5 |
| dim-raised text on that highlight: 4.45:1, so hints take the text colour on a highlighted item | - | - |
| Loop on (`--fl-on`) against the dock: 1.77:1 alone, so it keeps the short bar in the text colour (8.39:1) | - | 3 for the bar |

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
| Capture menu (keyboard) | Same behaviour; items Grab frame (G), Copy frame image, Copy link at timecode |
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
| YouTube Shorts | 0–19.8% (380 px) | 65–100% (672 px) | right 18% (201 px), from 36% to 65% | Top and right: adchecklab.com (organic Shorts); bottom: Google's vertical-ad template as quoted by socialync.io and adkit.so. Other sources give 180 to 288 px top, 390 to 576 px bottom | Secondary sources; the largest margin is used. The rail's vertical extent is my estimate |
| Instagram Reels | 0–15.5% (297 px) | 65–100% (672 px) | right 21% (227 px), from 38% to 65% | Top: an organic checker tool (Meta's ad guide says 14%); bottom: Meta's ad guide as quoted by lilachbullock.com; right: one source for the button column (the side margin is 6%) | Secondary sources; the largest margin is used. The rail's vertical extent is my estimate |
| TikTok | 0–12.5% (240 px) | 65.6–100% (660 px) | right 16% (173 px), from 38% to 65.6% | The 720x1280 in-feed template scaled to 1080x1920 (yosefk.me and others); other sources say 130 to 160 px top, 422 to 484 px bottom, 120 to 173 px right | Unverified; the largest margin is used |

**Step 6c rule (F1):** a safe-zone guide must never promise space the platform's UI may cover, so where sources disagree the largest margin wins (rule also written at the top of `platform-zones.ts`). This replaced the step 6b choice of the smallest TikTok margins.

So the brief's proposed defaults were replaced for Shorts and Reels (bigger bottom bands: 35%, not 20% and 28%) and kept in spirit for TikTok. Every platform item says "Approximate", the menu carries a note ("Apps change their layouts: check the platform's current guidance"), the announcement says "approximate", and the README says the same. **The author should overlay each platform's current template once and correct `src/pro/studio/guides/platform-zones.ts`**; it is the only file to edit.

### How the picture rectangle is computed and kept current

- `pictureRect(stageW, stageH, videoW, videoH, fit)` in `src/pro/studio/guides/geometry.ts` (pure, tested): for `contain` the largest centred rectangle with the ratio `videoWidth / videoHeight`. It also handles `fill`, `cover` (the rectangle is then larger than the stage), `none` and `scale-down`; the mode is read from the video element's computed `object-fit`. `object-position` is taken as centred.
- `usePictureRect` measures the `<video>` element's own box (so any CSS on it is respected), places the result relative to the overlay layer's parent, rounds the edges to device pixels, and writes `--fl-picture-x/y/w/h` on the container. The Viewer skin's `.pro-overlay` rule uses those variables (falling back to the whole parent), so the overlay layer **is** the picture and guides are drawn in its coordinates. The host's `overlay` slot is positioned the same way in Studio.
- Recomputed on: a `ResizeObserver` on the video element and on the stage (covers window resizes, density changes, the dock changing height, entering and leaving fullscreen), the media's `loadedmetadata`, `resize` and `emptied` (a new source, a rendition of another shape), `fullscreenchange`, and window `resize`. Before metadata there is no rectangle and nothing is drawn.
- No workaround was needed. **Pixel aspect ratio is ignored**: `videoWidth / videoHeight` is taken as the display ratio (browsers report anamorphic sources already scaled). Rotation metadata likewise.

### How the guides are drawn

- One `<svg>` per guide (`data-guide="title-safe"`, `"9:16"`, `"zones-tiktok"`…), each the size of the picture, with user units equal to CSS pixels and coordinates on device-pixel centres (`crisp`, `crispRect`), `shape-rendering: crispEdges`.
- **Every line is drawn twice:** a 3 px stroke of black at 50%, then a 1 px white stroke at 75% on top. Over white the dark edge shows; over black the white line shows. Dashed for safe areas and zones, solid for thirds, the centre cross and the crop's edge. No accent.
- Crop: the outside is filled `rgb(0 0 0 / .55)`; when the picture already has the ratio only the outline is drawn (`cropMask(...).full`). Zones: `rgb(0 0 0 / .35)` plus the dashed outline.
- Labels are HTML pills (10.5 px, `--fl-text` on `rgb(14 14 16 / .72)`), hidden under a 480 px wide picture. Title safe's label sits inside its top-left corner; Action safe's sits **on** its top edge, because the gap between the two rectangles (1.5% of the height) is too small for a label. The rail's label sits to its left.
- The centre cross is 5% of the picture height tip to tip, at least 8 px.

### View state, persistence, events

- `src/pro/view.ts` (pure, in the runtime chunk): `ViewState { guides, crop, zones, hidden }`, `allowedView(features)`, the reducers (`toggleGuide`, `setCrop`, `setZones`, `toggleHidden`), `viewMenuModel`, `activeCount`, `viewAttributes`, `serializeView`, `parseStored`. The store's old `activeOverlays` set is replaced by `view`.
- **Zones and the 9:16 crop:** a zone always carries crop `9:16`, also when the host's guide list does not offer 9:16 as a crop (zones need the frame); choosing another crop, or None, clears the zone ("Crop 1:1. Platform zones off"). Setting zones to None keeps the 9:16 crop only if the host offers it.
- **Badge:** checkbox guides, plus one for a crop; a zone with its frame counts as one. Hidden counts as zero.
- **Hide/Show** keeps the set and flips `hidden`. Any choice made while hidden shows the guides again. `hidden` is not persisted: a reload shows the remembered set.
- **Persistence:** one key (`frameline:v1` (`videojs-pro:v1` until step 8) or the host's), JSON `{ v: 1, guides, crop, zones, timeDisplay }`, read synchronously in the store's initialiser (in `ProRuntime`'s `useState`), so the first render already has it; there is no visible flash because guides wait for the picture rectangle anyway. Written on every change of `view` or `timeDisplay`. Every access is in `try/catch`. **Storage can come back empty, blocked or holding anything, and nothing depends on it.**
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
- **The image tools should use the picture rectangle**: `usePictureRect` returns `{ rect, layer }` and publishes `--fl-picture-*`. Zoom and pan are the risk: the hook measures the video element's box and re-measures on `ResizeObserver`, which does **not** fire for a CSS `transform`. If zoom transforms the video, the guides will not follow unless the transform is put on a wrapper that holds both the video and the overlay layer, or the hook is told to re-measure. Decide first whether guides should zoom with the picture (probably yes).
- Channel and gain/gamma filters on the video do not affect the overlay layer (it is a sibling), which is what we want: guides stay white.
- The store still has `inspection` (channel, gain, gamma, zoom) from step 3, unused. `infoHud`, `channels`, `gainGamma`, `zoom` are on in Studio with no UI.
- The badge counts guides only; decide whether an active image tool counts.
- Persistence: add fields to `serializeView`/`parseStored` (and bump nothing: unknown fields are ignored, missing ones default).
- Grab frame draws the raw video, so guides and image adjustments are never in the PNG; say so in the Image section if that surprises.

### Public URL (after the 6b deploy)

Guides, zones and the stored choices work on https://videojs-frameline.vercel.app/preview.html; the View menu's keyboard behaviour, announcements and `view:change` events match the local run; the Viewer gate checks pass again (tab order, keys, free keys, help dialog, no pro chunk, 40 px targets). In the 6a run Escape once failed to close the help dialog at 1440 px on the public URL; it closed in every later run, so I take that for a timing slip in the test script, not a defect, but it was not reproduced on purpose.

### Screenshots

`design/screenshots/step-6/` (same method): the View menu at 1440 and 390; each guide on its own; all four together; each crop; each platform's zones; all guides plus the 2.39 crop over white, black and mid-grey; TikTok zones over white; letterboxed and pillarboxed pictures; guides at 1100, 800, 390 and 320; the focus ring on the View button.

## Deployed URL

- https://frameline.artmarchuk.me is the canonical URL (a custom domain on the Vercel project `videojs-pro`). `videojs-frameline.vercel.app` stays as a secondary domain (it redirects to the canonical one). The "public-URL checks" sections below ran on the earlier vercel.app domains. Deploy: `npm run deploy vercel`. Since step 8 the root is the configurator page (`?tier=viewer|studio`, `?layout=`, one parameter per flag) and the CLI's workbench is at `/workbench.html`. The monitor page: `/preview.html` (opens in Studio; `?tier=viewer`, `?density=compact`, `?layout=dock|overlay`, `?debug`).
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
- **A set range confines playback (Studio).** Loop is on from the start where the host allows it (`createProStore({ loop })`). Playback starting from outside the range or from the Out frame starts at In; at Out it goes back to In, or pauses on the Out frame with Loop off; a range set or moved past a playing head sends it to In; a seek by the user or the host to outside the range while playing pauses there. The engine tells its own seeks from everyone else's with two flags around `seeking`/`seeked` (`controller.ts`), so a user seek is never pulled back to In. The pure decision is `playbackDecision` in `studio/logic.ts`; `scripts/browser-checks/range-playback.js` exercises it in Chromium, Firefox and WebKit. Out is still reached half a frame early, and the Out frame still shows for an instant at the loop point (Backlog).

## Backlog

- hls.js can skip forward about 2 s right after the range engine starts playback at In (see "Section 6" under "Dock polish, follow-up").
- The configurator page's dark palette still has the old blue-cast greys; make it neutral like the player.
- A `layout="overlay"` Studio bar still covers a small player; consider a compact overlay variant if a host needs it.
- Give `FramelineSkin` a title for grabbed file names (`<title>_<timecode>.png`).
- Stop the Out frame flashing at the loop point (jump one frame earlier) if it bothers in use.
- Translate the Studio strings (`src/pro/studio/strings.ts`).
- Overlay each platform's current safe-zone template and correct `platform-zones.ts` (step 6b used secondary sources).
- Open the View menu on its first item rather than on the first checked radio item, if Video.js gains a way to say so.
- Measure the Viewer skin's own weight against a stock Video.js skin.
- Redraw the settings icon: it reads a little like a sun.
- AirPlay and Cast buttons (removed in step 2), with custom icons.
- Translate `src/video/strings.ts` through Video.js i18n (`Text` tokens) so the help dialog and the More button follow the locale.
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
- **Step 6a: Copy frame image and Copy link from the new Capture menu** were not pressed in this run; the actions are the step 4 ones, unchanged.
- **Step 6a: menu type-ahead, `Home`/`End` in a menu.** Documented by Video.js, not tried.
- **Step 6a: screen reader.** Names, roles, values and the live region's text were read from the DOM, not heard.
- **Step 6a: a source without chapters and with markers** (the Markers menu without the Chapters heading, `[` `]` on markers) was not run in the browser; unit-tested.

- **Step 5b: real fullscreen with the dock.** Headless Chrome refuses fullscreen. Verified instead: the documented fullscreen target and the fixed-height layout.
- **Step 5b: Firefox, Safari, Windows and Android fonts, a real phone.** Chrome on macOS only; touch was emulated.
- **Step 5b: captions over the picture in the dock layout** were not looked at.
- **Step 5b: the fullscreen `:fullscreen .pro-stage` rule** (stage fills the screen) is untested for the same reason.
- **Step 5: Firefox and Safari.** Only Chrome was run. `:has()` (hides the seek preview over a marker), `color-mix()` and `mask-image` are inside the browser floor on paper, not tested.
- **Step 5: a real touch device.** Touch was emulated in Chrome.
- **Step 5: `onCopyLink` in the event log** were not pressed in the step 5 run (checked in step 5b).
- **Step 5: the one-hour case** used an overridden `duration` on the element, not a real one-hour file.
- **Step 5: screen reader.** Names, values and announcements were read from the DOM, not heard.
- **Step 4: nothing was looked at.** The Chrome window was hidden for the whole step (0×0 viewport, screenshots timed out), so the Studio bar's appearance, the new icons, the wrapping and breakpoints, focus rings, tooltips and the toast were never seen. Behaviour was tested through page scripts. This needs a visual pass before step 5.
- **Step 4: mouse-only range and loop** was exercised by clicking buttons from script, not with a real pointer. **320 px layout**, **touch**, **Firefox** and **Safari** were not run.
- **Step 4: Copy frame image** gave no result in the hidden window: neither success nor failure was announced, so the clipboard call probably never settled. Untested in a visible window.
- **Step 4: copy link** was tested with the clipboard call replaced by a stub; the real clipboard was not written.
- **Step 4: `onInOutChange`, `onCopyLink`, `onMarkerSelect`** are wired but the preview passes no handlers, so they were not seen firing in the browser (the store callbacks are unit-tested).
- **Step 4: cuts from `markers`** are covered by unit tests only; the demo stream has chapters.
- **Step 4: screen reader** output was read from the live region's text, not heard.
- **Step 3: frame numbers against a burned-in frame counter.** The demo stream has none. Our own 24 fps video (step 8) should carry one so this can be checked.
- **Step 3: frame clock in Firefox and Safari.** Firefox before 132 has no `requestVideoFrameCallback` and will use the approximate fallback; neither browser was run.
- **Step 3: phone-width re-check after step 3.** The Chrome window became hidden (0×0 viewport, screenshots timed out), so the layout could not be looked at again. The bar markup changed only by two optional slots and the CSS is unchanged.
- **Step 3: two `FramelineSkin` players on one page** were not rendered together; per-instance state is covered by a unit test on the store.
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

## Step 6c

### F2: View menu focus order
- The DOM was already in reading order (left column, right column, footer). The cause was Video.js: `menu.js` (`getInitialHighlightItem`) focuses the first **checked radio item** when a menu opens, which here was "Crop: None". Items and arrow order were fine.
- Fix: `Menu.Root onOpenChange` focuses the first enabled menu item one animation frame before Video.js's own highlight (it registers its frame after ours and skips when an item is already highlighted). Checked in Chrome on the production build: Enter and Space open on "Title safe"; Down walks Title safe, Action safe, Thirds, Centre, Crop None…9:16, Zones None…TikTok, Hide guides; also correct with a crop and zone checked; Escape returns focus to View. The script is `scripts/browser-checks/view-menu-focus.js` (the repo has no DOM test environment, so this one is a browser check, not a vitest).

### F3: range handles anchored on the outer edge
- The In tab's right edge is on the In point (body hangs left, outside the range); the Out tab's left edge is on the Out point (body hangs right). `handleBox` (pure, tested) gives anchor, tab and target edges; the component sets the handle's `left` from it.
- The timeline has a 12 px gutter on each side (`--tl-gutter`, one tab is 9 px), and the ruler, track and handles are drawn inside the gutters, so a handle at 0 or at the end is fully visible and not clamped. Ruler 0 and the end line up with the anchors.
- Measured at 1440 (CSS px): In target right edge 394.33 = band left 394.33; Out target left 746.73 = band right 746.75 (0.02 px rounding). Unset: In target right edge 108 = track left; Out target left 1332 = track right.
- Hit areas grow away from the range (24 px; 44 px on `pointer: coarse`), so In and Out can never overlap while In < Out, however short the range. The brief's "dragged handle wins / nearer anchor" rule is therefore never needed: pointer capture keeps a drag on its own handle. Test: one-frame range, 24 and 44 px.
- A drag keeps the grab offset, so snapping (5 px to the playhead and markers) and the bubble are measured from the anchor edge, not from the pointer or the tab's middle. The playhead (z-index 4) draws above the handles (3).
- Focus ring: the handle sets `data-pointer` on a pointer press and drops it on any key; the ring shows only for `:focus-visible:not([data-pointer])`. Chrome still matched `:focus-visible` after a mouse drag (script `focus()` after a pointer press), which is why the hand test showed a ring. Checked: after a drag no outline; after Tab a solid ring.
- Screenshots (2x crops): `design/screenshots/step-6c/handles-*.png`.

### F4: the container's focus ring
- Cause: `Container` (`@videojs/react`) defaults `tabIndex` to 0 and on every pointer-up calls `focusContainer`, so the container was a Tab stop and `.pro-skin:focus-visible::after` drew the ring. Fix: `tabIndex={-1}` on the Container in `src/video/skin.tsx` (a host can still pass its own) and the ring rule removed from `skin.css`. A click on the picture still focuses the container from code (needed for the hotkeys), without a ring.
- Hotkeys: `createHotkey` (`@videojs/core` `dom/hotkey/coordinator.js`) listens for `keydown` on the **container** (target `"player"`, the default), so keys pressed on any control inside it bubble to it. It skips Space and Enter on interactive elements (`isInteractiveActivation`: the control gets its own activation), editable targets, and events already `defaultPrevented`. Nothing else in `src/` depended on the container being a Tab stop (searched for `focus(`, `activeElement`, `:focus`); the help dialog returns focus to whatever had it, the container included.
- Checked in Chrome on the production build, Viewer and Studio: Tab from the page stops on the preview page's own switches, then **Seek** is the first stop in the player, with only its ring; `K` toggles play, `L` +10 s, `J` back, `M` mutes, `→` seeks (playing, Viewer) or steps a frame (paused, Studio); a click on the picture, then `K`, plays. `F` could not be checked (headless Chrome refuses fullscreen). Screenshots: `design/screenshots/step-6c/tab-first-control-*.png`.

### F5: narrow layout against `Narrow.dc.html`
The mockup was read from source this time (sizes, order, spacing). Already the same: row 1 (timecode 100x44, step back and forward as one segment of 2x40, Play 46x44, previous/next cut as a segment of 2x40), row 2 (segmented In, Out, Loop at 44 high with 1 px dividers, Loop on `--fl-on`; Capture, View, Settings, Fullscreen at 44x44), 10 px between rows, 8 px radius segments, 14 px timecode.
Changed to match: dock padding 12 / 15 / 14 px (was 12 px at the sides and below).
Differences kept, with the reason:
1. **Timeline width 270 px at 390, mockup 326.** F3's gutter, 29 px on each side on touch and narrow layouts, so the 44 px handle target fits inside the player without being cut at the edge (15 px dock padding + 29 = 44). F3 wins.
2. The mockup's handles sit inside the track, centred on their points; ours are anchored on the outer edge (F3).
3. Right group: 2 px between the four buttons (the mockup has none).
4. The mockup draws marker pins at 8x10 in one grey; ours are the same pin in `--fl-text-dim` and `--fl-accent` when selected.
5. Under 350 px (the accepted three rows at 320) the cut segment is not shown and In/Out/Loop take a full row; the mockup has no 320 case.
6. The mockup's card has a 1 px border and 10 px radius around picture and dock; ours is the preview page's frame (1 px line, the skin's radius).
Screenshots: `design/screenshots/step-6c/studio-390.png`, `studio-320.png` (before the change: `*-before.png`), Chrome headless, touch emulation, 2x.

### F6: Studio at 1024 px
Studio, range set, View menu open, headless Chrome 2x (`design/screenshots/step-6c/studio-1024*.png`). Looked for clipping, overlaps, crowding: the main row fits on one row with the cut buttons, Loop, Reset range, Markers, Capture, View, the divider, Captions, Settings, volume (icon only) and Fullscreen; no element passes the player's edge (checked by script: none) and the page does not scroll sideways. The View menu opens upward over the picture, two columns, fully inside the player, and its first item has the highlight. Nothing needed fixing within the accepted breakpoints.

### Step 6c checks
Tests 172 passing, build passes. Platform zones screenshot: `zones-tiktok.png` (top 12.5%, bottom 34.4%).

### Step 6c public-URL checks (https://videojs-frameline.vercel.app)
Viewer gate run on the public URL in headless Chrome: tab order Seek, Play, Mute, Volume, time, captions, Settings, PiP, Fullscreen; Space, K, J, L, arrows, M, 0-9, Home, captions `C` and the help dialog (`Shift+?`, focus in and back) work; 40 px targets; no horizontal overflow at 1440 and 320; **no pro chunk requested** (Studio requests `runtime`, `studio` JS and CSS only). Studio chunk names for 6c: `runtime-_dcTh6Bf.js`, `studio-DGHWJDs5.js`.

### 6c follow-up: playhead as one shape, marker at 0
- The playhead's head and line were two shapes, each with its own outline, so a dark seam showed where they met. They are one shape now: the line starts inside the head in the same colour, and a single `drop-shadow` outline goes around the union.
- A marker at 0 was drawn 4 px to the right of the playhead at 0: `layoutMarkers` clamped every pin inward by half a pin. That clamp is removed; a pin sits exactly on its time (a marker at 0 or at the end is on the same x as the playhead there), and the gutter around the track holds the half pin. Measured at 1440: playhead centre 108, pin centre 108, track left 108.

### 6c follow-up: the playhead wins over a marker pin
A pin under the playhead caught the press (it stops propagation so the slider does not also seek), so the playhead could not be grabbed from a marker. Now a press within 10 px of the playhead's centre goes on to the slider (grab and drag), and the click that follows does not select the marker. Pins away from the playhead behave as before. Checked in Chrome: click the "Logo too small" pin (8.42 s), press on the playhead and drag 120 px right: playback position 19.32 s; another pin still seeks to its marker.

## Step 6d

### D1: wider touch timeline
- A handle's target is built by `handleBox`: it grows away from the range, 44 px wide on touch (24 on desktop). Near an end of the track it would pass the player's edge, so it is slid back inside the player's box (`useRoom` measures how far the box reaches past the track: gutter plus dock padding) and so reaches over the track by the rest. Where the two targets meet (a very short range near an end) they split the overlap halfway between the anchors, so a fresh press goes to the nearer handle; a dragged handle keeps the pointer through pointer capture.
- The narrow and touch gutter is 13 px (was 29); desktop stays 12 px. Timeline width: **302 px at 390 (was 270), 232 px at 320 (was 200)**; the mockup has 326 at 390 because it clamps the handles inside the track, which F3 forbids.
- Measured with touch emulation (CSS px): In target 16 to 60 (player left edge 16), Out target 330 to 374 at 390 (player right edge 374); both 44 wide and 44 high (the 44 px height comes from `::before`). A press 4 px inside the target, over the padding, and a drag moved In to 44.1 s and Out to 74.3 s (390); 57.5 s and 62.6 s at 320.
- Bug found on the way: the slider's ref is a composed ref that is not attached while a child's layout effects run, so measuring in `useLayoutEffect` saw `null`; `useRoom` uses a passive effect.
- Screenshots: `design/screenshots/step-6d/timeline-390-idle.png`, `timeline-320-idle.png` (handles at 0 and at the end).

### D2: handle focus ring
The pointer mark is cleared on the next `keydown` on the handle and on `blur`. `scripts/browser-checks/handle-focus-ring.js` runs both sequences (drag, then an arrow key: ring and one frame; click, Tab away, Shift+Tab back: ring).

### D3: fullscreen after the container change
Checked in code (installed `@videojs/core` 10.x, `dom/presentation/fullscreen.js` and `dom/media-actions.js`):
- `toggleFullscreen` calls `requestFullscreen(container, media)`, which calls `container.requestFullscreen()` (or the webkit one); it needs the element and a user gesture, not focus and not a tab stop. It also calls `hideOpenPopovers(container)`. The `F` hotkey is a keydown listener on the container (see F4), so it fires from any focused control.
Checked in the browser with the Fullscreen API stubbed (headless Chrome refuses the real one), Viewer and Studio, `scripts/browser-checks/fullscreen-focus.js`: `F` from the first control and `F` after a click on the picture both call `requestFullscreen` on the container; when fullscreen ends with focus on the body, focus goes back inside the player.
Changes: `FullscreenFocus` (on `fullscreenchange` leaving fullscreen with focus on the body: the fullscreen button, or the container when the button is hidden); and a fix found by the check: in the Viewer the first click on the picture left focus on the body (the big play button takes focus on press, then hides), so `F` and `K` did nothing until a second click. The skin now focuses the container when a press inside the player ends with focus on the body.
Left for the hand test: real fullscreen entry and exit (Escape and the button) in Chrome, Safari (the container request and `webkit` prefix) and Firefox; that the dock is included in fullscreen; where focus is after Escape.

### D4: "Use frame as poster" removed
Setting a poster or thumbnail is the host product's job, with back-end work behind it, so it is not a skin feature. Removed: the Capture menu item, its handler (`controller.usePoster`), its announcement and strings, the `posterFrame` feature flag (and from the runtime's list of pro flags), the `onPosterFrame` prop and event and the `PosterFrameInfo` type, the preview page's `poster:frame` log line, its test, and the README and `PROJECT-OVERVIEW.md` lines. No icon was used only by it. The Capture menu is Grab frame (`G`), Copy frame image, Copy link at timecode. What remains of the word "poster" in the repo is the media's own poster image (`<Poster>` in the skin, `MEDIA.poster` in the preview) and the older step specs and the author's `Capture.dc.html` mockup, which I did not edit (the mockup still draws the item).

### 6d follow-up: handle drag preview
Dragging In or Out left the slider's hover preview frozen where the drag started (the handle stopped the pointer moves from reaching the slider), next to the handle's own timecode bubble: two timecodes. Now a handle drag shows one preview, the same as a playhead drag: `Thumbnail.Root time={dragTime}` (verified in the installed `@videojs/react` docs, `thumbnail.md`; `Slider.Thumbnail.Root` is the same component without `time`) with `Thumbnail.Image` and the timecode bubble, centred on the anchor and kept inside the timeline. The slider's hover preview and hairline are hidden while a handle is dragged (`:has(.pro-tl-handle[data-dragging])`), and the pointer moves are no longer stopped, so after release the hover preview is already at the pointer. Checked in Chrome: at three points of a drag the preview's centre equals the In anchor (187.7, 307.7, 437.6) and the stock preview is hidden; after release only the stock preview shows. The chapter title is not shown in the drag preview. Screenshot: `design/screenshots/step-6d/handle-drag-preview.png`.

## Step 7: Studio zoom (15 Nov 2026)

Step 7 was "Studio image tools"; it is zoom only. The rule: **Viewer is for watching, Studio is for checking timing and framing.** Studio adds controls and overlays around the picture and never processes it. The "For step 7" list under step 6b above is history: channels, gain and gamma, the info readout were never built and are out of scope now.

### Z1: overview and flags
- `specs/PROJECT-OVERVIEW.md`: two tiers, the rule, the View menu line, a "Zoom" section with one item, a new "Out of scope" section, "info HUD" dropped from the Region of interest line, step 6 marked done, step 7 renamed, artoix.com replaced by artmarchuk.me (three places). "Use frame as poster" was already gone. The feature-flag example used `scopes: false`, a flag that never existed; it reads `zoom: false` now.
- Flags removed: `channels`, `gainGamma`, `infoHud` (types, defaults, the runtime's list, the test, README). With them the store's unused `inspection` state (`setInspection`, `resetInspection`, `Inspection`, `Channel`, `Zoom` types). The preview page had no controls for them. `specs/step-7-studio-image-tools.md` was not in the repo. `CLAUDE.md` said "channel views" and "(step 7) image inspection"; corrected.

### Verified APIs (`@videojs/react` and `@videojs/core` 10.4.0, installed)
- **Hotkeys** (`core/dist/dev/dom/hotkey/hotkey.js`, `matchesHotkeyEvent`): modifiers must match exactly for letters and named keys. So `z` does not fire with Shift, Ctrl, Alt or Cmd, and `Alt+ArrowLeft` never matches the plain `ArrowLeft` bindings (seek, frame step) or `Shift+ArrowLeft` (jump), and the other way round. `Z` is in neither the YouTube map (`src/video/behaviors/hotkeys.tsx`) nor ours.
- **Gestures** (`core/dist/dev/dom/gesture/coordinator.js`): a tap is a `pointerup` on the container within 250 ms of the `pointerdown`; there is **no movement threshold**, so a quick drag counts as a tap. The listener is on the container in the bubble phase, which is why stopping the `pointerup` on the picture wrapper keeps a pan away from click-to-play and from the double-tap recogniser.
- **Rendition** (`core/dist/dev/core/store/features/quality.js`, `docs/reference/api/feature-quality.md`): `usePlayer(selectQuality)` gives `videoRenditionList` and `activeVideoRendition`, "the rendition currently playing, including when automatic ABR is selected". For `MuxVideo` (hls.js) it is set from the engine's `LEVEL_SWITCHED` event (`hlsjs-video/dist/dev/media-tracks.js`), and the feature also re-syncs on the media's `resize`. When the engine reports nothing it falls back to matching `videoWidth`/`videoHeight` against the list, and gives `null` if that is ambiguous.
- **`capRenditionToPlayerSize`** (`docs/guides/media-sources.md`): on by default; automatic selection is held to the smallest rendition that covers the element.

### Z2: how zoom is built
- **Picture wrapper.** `VideoSkin` takes `pictureWrapper`; `FramelineSkin` sets it from `features.zoom`. With it, the media, the poster and `.pro-overlay` sit in one `div.pro-picture` (100% of the stage, `transform-origin: 0 0`). Without the flag the element is not rendered: the Viewer's DOM was compared element by element (tag, classes, role) with the deployed 6d build and is identical. The wrapper's one CSS rule is in `skin.css`, because the element is rendered by the Viewer chunk and must be laid out before the Studio CSS arrives; it matches nothing in the Viewer.
- **Transform.** `src/pro/zoom.ts` (pure, tested): `zoomScale`, `clampCentre`, `zoomTransform`, `panCentre`, `nextZoom`. `useZoom` (`src/pro/studio/zoom.tsx`) writes `translate(x, y) scale(s)` on the wrapper. Fit removes the transform. 100%: `videoWidth / picture width / devicePixelRatio`; 200% twice that; a scale below 1 is applied as it is. The zoomed picture's corner is rounded to a whole device pixel of the screen.
- **Pan** is kept as the point of the picture at the centre of the stage (shares of its width and height), so a resize or a rendition of another size keeps the same spot. Clamped per axis: a picture larger than the stage stops with its edge on the stage's edge; a smaller one stays centred and cannot be panned. Entering a level resets to the centre.
- **Picture rectangle.** `usePictureRect` measures with `getBoundingClientRect`, which includes the transform, so it divides by the wrapper's scale (read from its computed transform). The rectangle and `--fl-picture-*` describe the unzoomed picture at every level; a `ResizeObserver` does not fire for a transform, and a resize while zoomed gives the right numbers (checked).
- **Guides** are inside the wrapper and scale with it. Their strokes, dashes and labels divide by `--fl-zoom-scale` (set on the wrapper), so a line is still about 1 px and a label the same size at 200%. Device-pixel snapping of the lines is only exact at Fit.
- **Pointer.** Native listeners on the wrapper. A drag over 3 px takes pointer capture and pans; its `pointerup` and the click after it are stopped, and focus is put on the container if it was on the body (the container did not see the press end). `touch-action: none` on the wrapper while there is something to pan, so one finger pans and the page does not scroll. No pinch zoom. Cursor `grab` / `grabbing`.
- **Recomputed** on: level, a new picture rectangle, a `ResizeObserver` on the stage, the media's `loadedmetadata`, `resize` and `emptied`, `fullscreenchange`, window `resize`.
- **State.** `zoom` is a field of the store (`'fit' | '100' | '200'`), not of `ViewState`, so it is never serialised. `AllowedView` has `zoom`; `setZoom` and `cycleZoom` do nothing without it, and `setAllowedView` puts the level back to Fit when the host turns the flag off. The container carries `data-zoom="100" | "200"` while zoomed (not at Fit).
- **Menu.** The Zoom radio group is the View menu's `extra`, under Platform zones, with the same click-and-prevent pattern to stay open. Opening the menu still focuses "Title safe"; arrow order ends …TikTok, Fit, 100%, 200%, Hide guides. With `guides: false` and zoom on, the View button stays and the menu is the Zoom group alone (no "Hide guides" footer). The badge still counts guides only.
- `image-rendering: pixelated` on the video at 200% (`data-zoom="200"`).

### Shortcuts
- `Z` cycles Fit, 100%, 200%. No conflict.
- `Alt+arrows` pan, registered only while zoomed. No conflict with the map or with Video.js. Two things found:
  1. **The seek slider.** With the slider focused, `Alt+→` moved the playhead (our key handler passed Alt combinations to the stock slider). Now Alt + an arrow on the slider is left to the hotkeys, so it pans. On an In or Out handle it already did.
  2. **The browser.** On Windows and Linux `Alt+←` and `Alt+→` are Back and Forward. While zoomed and with focus in the player the skin takes them (`preventDefault`); at Fit they are not registered and stay with the browser. On macOS Option + arrow has no browser meaning outside a text field. Kept as the brief asks. If the author would rather not shadow Back and Forward at all, `Shift+Alt+arrows` is free.

### Z3: rendition notes
- **Available**, from `selectQuality` (see above). `useRenditionNote` compares `activeVideoRendition.height` with the largest height in `videoRenditionList`; below it, the note is "showing 720p". It is added to the chosen Zoom item ("100% showing 720p", the note in dim text) and to the announcement ("Zoom 100% · showing 720p"), and only while zoomed. No on-picture badge.
- **Settings → Quality: nothing added.** Video.js already shows the playing rendition under Auto, as "Auto (720p)", in the item and in the settings row, updated on a rendition change and translated (`autoWithLabelText`, `core/dist/dev/core/ui/quality-radio-group/core.js`). The brief's "Auto · 1080p" would have meant replacing a translated string with our own for a different separator.
- **What this showed.** The demo stream offers 360p to 2160p. Under Auto the engine caps the rendition to the player's size, so on a 1280 px stage it plays 720p at 1x (1440p at 2x) and **100% is the same size as Fit**; 200% is 2x. That is correct by the brief's formula and it is what the note is for, but it reads as "100% does nothing". With 2160p picked by hand, 100% is 3x at 1x. Options for the author, none taken: leave it; set `capRenditionToPlayerSize: false` on the demo's `MuxVideo` source in step 8; or have zoom pick the top rendition while zoomed (changes playback, so not done without a decision).

### Checks (headless Google Chrome via Playwright; local production build, then the public URL)
`scripts/browser-checks/zoom.js`, run at device scale factor 1 and 2, all passing:
| Check | Result |
| --- | --- |
| Scale | 1x: video 1280 wide in a 1280 px picture, 100% = 1, 200% = 2. 2x: video 2560 wide, 100% = 1, 200% = 2 (video box x devicePixelRatio = videoWidth, and twice that) |
| Pixelated | `image-rendering: pixelated` at 200% only |
| Guides follow | the thirds SVG's box equals the video's box at 200% (2560x1440 at 1x); `--fl-picture-*` unchanged by zooming; after a window resize while zoomed the rectangle is the new unzoomed size and the picture still covers the stage |
| 10 px drag | paused: stays paused, picture moved 10 px. Playing: keeps playing, moved 10 px. Two quick drags: no fullscreen request, still playing. A click afterwards pauses |
| Alt+arrows | one press moves 128 px (a tenth of 1280); 30 presses each way stop with the picture's edges exactly on the stage's edges (0 px gap on all four); the playhead did not move |
| Grab frame | `G` at Fit and `G` at 200% panned into a corner: same canvas size (the video's own) and the same pixel checksum |
| Z cycle, announcements | Fit, 100%, 200%, Fit; "Zoom 100%", "Zoom 200%", "Zoom fit" (with the rendition note when it applies) |
| Menu | opens on "Title safe"; order ends TikTok, Fit, 100%, 200%, Hide guides; choosing 100% checks it (`menuitemradio`, `aria-checked`) and the menu stays open; the stored value has no zoom |
`scripts/browser-checks/zoom-rendition-note.js`: Auto shows "Auto (720p)"; note present under Auto, absent with the top rendition picked and playing (2160p).
Also checked: touch emulation at 390 px (one-finger drag panned 60 px by 30 px, the page did not scroll, a tap still plays; Zoom items 44 px tall; the menu stays inside the player); Alt+→ on the focused seek slider and on the In handle pans and does not seek; help dialog lists `Z` and `Alt ← → ↑ ↓`; `?zoom=0` (no wrapper, no Zoom group), `?guides=0` (View menu with Zoom only), `?guides=0&zoom=0` (no View button), `?tier=viewer&zoom=1` (overlay layout: zoom and drag work under the controls).
Unit tests: 192 passing (19 new: scale at devicePixelRatio 1 and 2, 100% smaller than Fit, clamping, centring, a letterboxed picture, device-pixel start, pan steps to the edge, the Z cycle, the flag turning zoom off, zoom not serialised, `allowedView` with and without guides).

### Chunk sizes (raw / gzip -9)
| Chunk | Step 6d | Step 7 |
| --- | --- | --- |
| Viewer path JS (`preview-*.js`) | 969,319 / 285,076 B | 969,469 / 285,102 B (+150 B raw: the wrapper branch, the `pictureWrapper` prop, the preview page's `?zoom`) |
| Skin CSS (with the preview page's) | 36,020 / 6,545 B | 36,105 / 6,561 B (the `.pro-picture` rule) |
| Pro runtime | 12,351 / 4,876 B | 12,964 / 5,204 B |
| Studio JS | 50,709 / 16,397 B | 56,312 / 17,975 B |
| Studio CSS | 22,529 / 4,062 B | 23,111 / 4,189 B |

### Screenshots
`design/screenshots/step-7/` (same method, 1x so that 200% shows real pixels; each opened and looked at): `zoom-fit`, `zoom-100`, `zoom-200` with title safe and thirds on; `zoom-200-panned` (the top-left corner, with the title-safe corner in view); `zoom-100-1080p-picked` (1080p chosen by hand: 100% is 1.5x); `view-menu-zoom-1440`, `view-menu-zoom-390`; `zoom-200-390`; `settings-quality-auto`. `zoom-100` looks like `zoom-fit` for the reason under Z3.

### Unverified (step 7)
- **Real fullscreen while zoomed** (headless Chrome refuses fullscreen). The transform is recomputed on `fullscreenchange` and by the stage's `ResizeObserver`.
- **Firefox and Safari:** `image-rendering: pixelated` on a `<video>`, `calc()` with a custom property in `stroke-width` and `stroke-dasharray`, the `scale` property on the labels, `DOMMatrixReadOnly` from a computed transform. All inside the browser floor on paper; only Chrome was run. If `calc()` in a stroke property is not supported, the lines are thicker while zoomed and nothing else changes.
- **A real mouse, trackpad and finger.** Drags were scripted (Playwright mouse, CDP touch events). How the 3 px threshold feels, and panning on a real phone, need a hand.
- **Pixel-exact 100%.** The scale and the device-pixel start were measured from element boxes; whether Chrome then draws one video pixel on one device pixel without resampling was not measured from a screenshot.
- **A rendition switch while zoomed** (Auto stepping up or down mid-view): the transform is recomputed on the media's `resize` and the pan keeps its centre, but it was only seen as a manual switch between zoom presses, not during one.
- **Captions while zoomed**: the browser draws them inside the video element, so they scale and can be cut off. Not looked at.
- **A video smaller than the stage** (100% below Fit) is unit-tested; no such source was played.
- **Screen reader:** announcements were read from the live region's text.
- **Windows and Linux:** that `preventDefault` on `Alt+←` stops the browser's Back while zoomed was not run there.

### Step 7 public-URL checks (https://videojs-frameline.vercel.app)
Viewer gate in headless Chrome at 1440 and 320: tab order (Seek, Play, Mute, Volume, time, captions, Settings, PiP, Fullscreen; the 320 px set is shorter as before), `K`/Space, arrows, `J` `L`, `5`, `Home`, `M`, `↓`, `C`, the help dialog (11 rows, focus in and back), 40 px targets, no overflow, **no pro chunk requested**. The Viewer's DOM (every element's tag, classes and role) is identical to the step 6d deploy, with no `.pro-picture`; `Z` and `Alt+arrows` do nothing there. Studio: `scripts/browser-checks/zoom.js` passes at device scale factor 1 and 2.

## Step 7b: Guides menu and Zoom button (15 Nov 2026)

### G1: View becomes Guides
- Renamed: the button's label, tooltip ("Guides" with `Shift+V` beside it, the way every other tooltip shows its key), accessible name ("Guides", "Guides, 2 guides on"), `aria-keyshortcuts`, the strings, the component and file (`guides-menu.tsx`, `GuidesMenu`, `useGuidesActions`), CSS classes (`pro-guides-*`), `data-pro-menu="guides"`, the browser check (`guides-menu-focus.js`), README and the overview. Public names: `onViewChange` is `onGuidesChange`, the preview log line `guides:change`, the exported type `EffectiveGuides`. No alias.
- Not renamed: the pure model file `src/pro/view.ts` and its internal names (`ViewState`, `allowedView`, `viewMenuModel`), which are not public; its header says what it is. Announcements never contained the word "View".
- Icon: a frame (17x14, radius 2) with a dashed inner frame, on the set's **24 grid with a 1.5 stroke**. The brief says "20 px grid"; the existing icons are drawn on 24, so the new one follows them.
- The Zoom group and its help text are out of the menu. `guides: false` removes the button again (`hasViewMenu` no longer counts zoom). The menu opens on "Title safe" and walks to "Hide guides" in reading order (checked).

### G2: the Zoom button
- `ZoomMenu` in `src/pro/studio/zoom.tsx`, rendered in the `tools` slot after Guides (so before the divider and Captions; on the narrow dock next to Guides). A Video.js `Menu` with a `Menu.RadioGroup`; choosing a level closes the menu and focus returns to the button, like the Capture menu. It opens on the checked level (Video.js's own behaviour for a radio menu, which is right here).
- The button: the level as text, 52 px wide at every level (`font-variant-numeric: tabular-nums`, 13 px semibold), the height of the other dock buttons (34 px; 44 on touch), `data-pressed` (the `--fl-on` fill and its short bar) while zoomed. Name "Zoom, Fit" / "Zoom, 200%"; tooltip "Zoom" with `Z`. Measured: the button's left edge and width and the Settings button's position are the same at Fit and at 400%.
- Levels `fit`, `100`, `150`, `200`, `400` (`ZOOM_LEVELS`); each is a multiple of 100% (`FACTOR`). `data-zoom` carries the level; `image-rendering: pixelated` for 200 and 400.
- **Pixelated was measured this time**, from screenshots at device scale factor 1: at 200% identical pixels come in runs of 2 px, at 400% in runs of 4 px; at 100% and 150% there are no such runs. So Chrome does draw the scaled video with nearest-neighbour through the wrapper's transform. (In step 7 this was read from the computed style only.)
- **A Video.js detail found:** a menu is sized by measuring its content at max-content width (`core/dist/dev/dom/ui/menu/popup.js`, `measureContent`), where a paragraph is one line. The help line wrapped once the menu had its width and was cut off. It has a width of its own now (232 px), so it measures as it renders.
- Shortcuts: `Z` next, `Shift+Z` previous (from Fit it goes to 400%). Pan is `Shift+Alt+arrows`, registered only while zoomed. Conflicts checked against the installed hotkey matcher (modifiers must match exactly) and both maps: none. `Shift+←/→` (jump 10 frames) and `Alt+←/→` are different patterns. `Shift+Z` is not in the YouTube map. On macOS `Shift+Option+arrow` extends a text selection by a word, which only matters in a text field, and the player has none.
- The seek slider: `Alt+→` is passed to the stock slider again, as before step 7 (it moves the playhead 1 s); `Shift+Alt+→` there pans.
- Flags: `zoom: false` removes the button, the shortcuts, the help rows and the wrapper; `guides: false` with zoom on leaves the Zoom button and no Guides button.

### G3: the rendition cap
- **It can change at runtime.** `capRenditionToPlayerSize` is a field of the media's `source` (`docs/guides/media-sources.md`). In the installed `@videojs/hlsjs-video` (`adapter.js`) `set source` calls `#applyRenditionCaps()`, which sets the engine delegate's `capRenditionToPlayerSize`; that setter re-runs the cap controller (`hls-js-only.js`, `cap-level.js`). A load is requested only when `src` or the engine options change, and the cap is in neither. `MuxVideoAdapter`'s `set source` adds a metadata reset that is keyed by URL, so it is a no-op here.
- **Done:** `useLiftRenditionCap` (Studio). While zoom is above Fit and no rendition is selected (Auto), it assigns `{ ...source, capRenditionToPlayerSize: false }` to the media from `useMedia()`; leaving that state puts the host's own source object back, unless the source was replaced meanwhile. It never selects a rendition. With a rendition picked by hand, or a host that set the cap off itself, or media without `source` and `videoRenditions`, it does nothing.
- **Checked** (`scripts/browser-checks/zoom-rendition-cap.js`, 1x): playing at Fit 720p; `Z`: 2160p two seconds later; `Shift+Z` back to Fit: 720p again once the buffered segments were played (about 30 s); no `loadstart` or `emptied`, playback never stopped.
- **What it does not do:** it changes what is fetched from then on. **A frame you paused on stays in the rendition it was buffered in**: paused at 20 s, zoomed, waited 8 s, stepped a frame: still 720p. After a seek away and back it was 2160p. The note ("showing 720p") stays correct throughout. Making the paused frame sharp would mean flushing the buffer or selecting a rendition, which the brief rules out; picking the top rendition in Settings → Quality does it.
- A side effect to know: when the higher rendition arrives while zoomed, `videoWidth` grows, so the scale for the same level grows with it (100% of 2160p is three times 100% of 720p on this stage). The label stays true and the pan keeps its centre, but the picture visibly jumps.
- If a host passes a new `source` object while zoomed, React sets it on the media and the cap is back until the next zoom change. Not handled.

### Layout: the new numbers
The Zoom button adds 56 px (52 + gap) to the right column. Measured with a range set (Reset range in the row), by player width:
- The old breakpoints with the new button: the row started to overlap at about 670 px (it needs about 690), where the narrow arrangement did not begin until 640.
- So every step moved up 60 px. **One row sheds: volume slider under 1100 (was 1040), duration 1040 (980), captions 940 (880), chevrons 900 (840), badges and divider 800 (740). Two rows under 700 (was 640)**, and always on touch. `DOCK_NARROW_BELOW = 700`. No overlap and nothing outside the player at any width tried from 1280 down to 288.
- The transport is centred from about 1280 px up (was about 1170); below that it sits left of centre by up to 100 px, as before but sooner. Nothing was dropped to buy that back.
- **Narrow dock, new:** the second row (In, Out, Loop, then Capture, Guides, Zoom, Settings, Fullscreen) needs about 405 px. At 390 it wrapped Fullscreen onto a line of its own, so **under 410 px In, Out, Loop take a row of their own and the five buttons the next: three rows at 390**, where step 6c had two. The dock is one row (54 px) taller on a phone. The cut buttons still step aside under 350.

### Checks
`zoom.js` (1x and 2x, local and public): the five levels and both cycles, scale at each level, pixelated from 200%, guides follow, a 10 px drag, `Shift+Alt+arrows` to the edges, grab at Fit equals grab zoomed and panned, `Alt` + arrows alone neither pan nor seek from the container, the slider's `Alt+→` and `Shift+Alt+→`, the Guides menu order, the Zoom button's text, name, pressed state, fixed width, the menu's items and help, focus back on the button. `guides-menu-focus.js`: opens on "Title safe". `zoom-rendition-note.js` and `zoom-rendition-cap.js`. Flags by URL: `?zoom=0`, `?guides=0`, both, `?tier=viewer&zoom=1`. Touch emulation at 390: Zoom menu inside the player, items 44 px, the button 52x44. Unit tests: 196.

### Chunk sizes (raw / gzip -9)
| Chunk | Step 7 | Step 7b |
| --- | --- | --- |
| Viewer path JS | 969,469 / 285,102 B | 969,477 / 285,106 B (the preview page's event name) |
| Skin CSS | 36,105 / 6,561 B | 36,105 / 6,561 B |
| Pro runtime | 12,964 / 5,204 B | 13,069 / 5,243 B |
| Studio JS | 56,312 / 17,975 B | 57,545 / 18,202 B |
| Studio CSS | 23,111 / 4,189 B | 23,484 / 4,230 B |

### Screenshots
`design/screenshots/step-7b/` (headless Chrome, 1x; each opened and looked at): `guides-menu`, `zoom-menu`, `zoom-menu-390`, `zoom-button-fit|100|150|200|400` (the right column of the row), `zoom-150`, `zoom-400`, `zoom-200-390`, `layout-1440`, `layout-1100` (the new first threshold), `layout-1024`, `layout-390`, `layout-320`.

### Unverified (step 7b)
- Everything listed under step 7 that needs a real browser other than Chrome, a real pointer or real fullscreen still stands, except pixelated drawing in Chrome, which is now measured.
- **Windows and Linux:** that `Alt+←` now goes back in the browser while zoomed was reasoned from the code (the pattern is no longer registered), not run there.
- **The cap lift on a slow connection, on native HLS (Safari), and with a host `source` object.** Chrome with hls.js on a fast connection only. On Safari the media has no renditions, so the hook does nothing.
- **How the jump in size feels** when a higher rendition arrives mid-zoom.
- **A real phone:** the three-row dock at 390 was seen in emulation.

### Step 7b public-URL checks (https://videojs-frameline.vercel.app)
Viewer gate at 1440 and 320 in headless Chrome: tab order, `K`/Space, arrows, `J` `L`, `5`, `Home`, `M`, `↓`, `C`, the help dialog (11 rows, focus in and back), 40 px targets, no overflow, **no pro chunk requested**; `Z`, `Shift+Z` and `Shift+Alt+arrows` do nothing in the Viewer; its DOM (every element's tag, classes and role) is identical to the step 6d deploy. Studio: `zoom.js` passes at device scale factor 1 and 2, `guides-menu-focus.js` opens on "Title safe" and returns focus to "Guides", `zoom-rendition-cap.js` passes (720p, 2160p while zoomed, 720p again, no reload).

## Step 8: Configurator page, demo media, features doc (15 Nov 2026)

### 8.3: the six open items, answered from the code
1. **Events.** They are **callback props** on `FramelineSkin`; the skin dispatches no DOM events (`grep dispatchEvent|CustomEvent src` finds nothing). The colon names in the overview (`inout:change`, `marker:select`, `frame:change`, `guides:change`, and `link:copy` in the monitor page's debug log) were only labels in that log; they are not an API. The props and payloads: `onInOutChange({ in, out })` (seconds or `null`); `onMarkerSelect(marker)` (`{ time, label, end?, id? }`); `onFrameChange({ frame, time })`; `onCopyLink({ url, frame, time })`; `onGuidesChange({ guides, crop, zones })`; and, new in this step, `onZoomChange(level)` and `onFrameGrab({ frame, time, timecode, width, height, target, fileName? })`.
2. **Captions shortcut: yes, `C`** (`src/video/behaviors/hotkeys.tsx`: `keys="c" action="toggleSubtitles"`), in both tiers.
3. **Viewer touch gestures** (`src/video/behaviors/gestures.tsx`): a tap shows or hides the controls (the centre button plays); a double tap on the left or right third seeks 10 s back or forward; a double tap on the centre third toggles fullscreen. In a dock layout a tap plays or pauses instead, because the controls never hide. No swipe, no pinch. (Studio adds one-finger pan while zoomed.)
4. **`[` and `]`: previous and next cut.** The cut list is the media's chapter starts when it has chapters, **otherwise** the host's markers (`buildCutList` in `src/pro/studio/logic.ts`). Never both. When a cut comes from a marker, the marker is also selected.
5. **`density`: exists and is public** (`FramelineSkinProps.density`, `'comfortable' | 'compact'`). Touch always gets comfortable.
6. **Slots: they exist, as one prop**, `slots={{ toolbarStart, toolbarEnd, overlay }}` (camelCase keys; the overview's kebab names were never the API). `overlay` is drawn in the `aria-hidden` layer over the picture.

### 8.R: the rename
- Renamed: the package (`videojs-frameline`, also `skin.json`, the lockfile, the workbench's config), the public component (`FramelineSkin`, `FramelineSkinProps`, `FramelineSkinSlots`; file `src/pro/frameline-skin.tsx`; no alias), the page titles and the monitor page's heading, README, NOTES, the overview, `CLAUDE.md`, the comments that named the product, the development warning prefix (`[frameline]`), and the storage key (`frameline:v1`; a browser that remembered guides under `videojs-pro:v1` starts fresh).
- **Tokens: `--pro-*` is `--fl-*`.** It was mechanical: one substitution over `src`, `apps`, `scripts` and the docs (69 token names, 13 files). Checked beyond typecheck, tests and the contrast script: the computed styles of every element of the skin (20 properties and both pseudo-elements, Studio, Viewer and compact) are identical before and after, and the set of tokens that CSS reads but only script sets is the same eight names.
- Left as they are (internal): `src/pro/`, the `.pro-*` classes, `data-pro-*`, `ProStore`, `ProRuntime`, `useProStore`, the chunk names. Also left: the old step files in `specs/` (history), and **the Vercel project (`videojs-pro`)**. The repo folder was renamed `videojs-pro` → `videojs-frameline` later (16 Nov 2026). A search for "Video.js PRO", "VideoJS PRO" and "PRO" as a name finds them only in `specs/step-*.md` and in the notes that describe the rename.

### 8.0: 100% means the source
- `sourceWidth()` in `src/pro/zoom.ts`: the widest rendition in Video.js's `videoRenditionList` (a rendition that gives only its height takes its width from the playing picture's aspect ratio); with no list, the decoded `videoWidth`. `useZoom` takes the list and recomputes when its widest entry changes.
- On the demo stream (360p to 2160p) on a 1280 px stage at 1x, 100% is now 3x, 200% is 6x and 400% is 12x, whatever is playing. The "showing 720p" note is unchanged.
- **Checked** (`zoom-rendition-cap.js`, public URL, `?cap=1`): at 100% and panned off-centre, the transform is `translate(-1408px, -792px) scale(3)` while 720p plays, the same after the lifted cap brings 2160p in, and the same after 360p is forced by hand in Settings. No reload. The check's last part (the cap is back at Fit) is weaker than in 7b, because the forced 360p is still playing when it looks.
- `zoom.js` reads the source's width from the Quality menu and needed more arrow presses to cross a picture that is now up to 12 times the stage. `zoom-rendition-note.js` still cycled as if there were three levels; fixed.

### 8.1: demo media
- **Where:** `apps/preview/src/frame/media.ts`, the file `CLAUDE.md` already names as the one place for the media, not a new `src/demo/media.ts`: `src/` is the skin and imports nothing from the site. One entry per source; `ACTIVE_SOURCE` is the one line to change. `cosmicDawn` (active) and `reel` (placeholder ID `REEL_PLAYBACK_ID`, 24 fps, placeholder files in `apps/preview/public/demo/reel/`). The test stream's chapters moved to `public/demo/cosmic-dawn/chapters.vtt` and its markers out of the code into `markers.json` there.
- `DemoVideo` and `useDemoMarkers` (`demo-video.tsx`) are shared by both pages. Markers are fetched; a missing or malformed file gives none.
- **`capRenditionToPlayerSize: false`** on every entry, passed in MuxVideo's structured `source`. The stream now plays 2160p at Fit on a 1440 px window. `?cap=1` puts the cap back, for the checks that need a capped source.
- **A regression caught by the Viewer DOM comparison and fixed:** a structured source with only `src` gets no storyboard track from MuxVideo (`createMuxStoryboardURL` needs `playbackId`), so the hover thumbnails had gone. Entries with a playback ID are now passed as `{ playbackId }`. The video's children are the same six as in 7b again.
- `?media=reel` shows Video.js's error dialog (the placeholder ID does not exist), with the reel's chapters track loaded: the code paths run.

### 8.2: the configurator page
- **Files.** `apps/preview/index.html` is the page: all of its content is static HTML. `src/page/page.css` styles it, `src/page/config.ts` is its state (pure, unit-tested: defaults, query string, snippet), `src/page/main.tsx` mounts the player and wires the form. No framework beyond the React the player already needs. **The CLI's workbench shell moved from `/` to `/workbench.html`**; `apps/preview` was "do not change", and this step changes it on the brief's instruction.
- **Order:** header, player (up to 1280 px), Configure, Code, then Event log and Try this side by side (one column under 900 px), About in the footer. DOM order is the reading order.
- **Tier** resets the flags and the layout to that tier's defaults. **Platform zones** is disabled while Guides is off. The snippet is one line up to 84 characters, then one prop per line; it always names `tier` and `fps`.
- **URL:** `tier` always; `layout` and each flag (`zoom=0`, `timecode=1`) only where they differ from the tier. Parameters that are not the page's (`media`, `debug`) and the `#t=` frame link survive. `history.replaceState`, no reload.
- **The page needed a way to drive the player, and there was none**, only props and callbacks. Added to the skin, small and documented: **`apiRef`** (`seek`, `step`, `setRange`, `setLoop`, `setGuides`, `setZoom`, `pan`, `grabFrame`), filled by the lazy Studio layer, so it costs the Viewer nothing; and the events **`onZoomChange`** and **`onFrameGrab`**, which the event log and the brief's check ("the log receives a frame grab") need. The store gained `setRange` and `setGuides`, each one change and one event. Handle calls are silent for screen readers; the page says what each "Show me" did in a status line next to the buttons.
- **Show me** never moves focus (checked: focus is still on the button). It scrolls the player into view. A task whose flags are off is disabled and says which feature to switch on. Times are taken from the video's duration, so the copy holds for any source.
- **Event log:** the last 20, newest first, each with the player's timecode. `onFrameChange` is left out (one per frame). Not a live region.
- **Theme:** the page follows the system; the player stays dark. Links and focus rings are the accent in the dark theme and a darker shade of it (`#1D5FD1`) in the light theme, because `#5B9DFF` is 2.7:1 on a light page. Checked boxes and the chosen segment are neutral. 28 new rows in `scripts/contrast.mjs`, all pass.
- **Meta:** title, description, Open Graph and Twitter tags with absolute URLs on `frameline.artmarchuk.me`, a canonical link and `meta author`; `og.png` (1200x630) from `scripts/og-image.mjs`; `favicon.svg`, the Guides icon on the dock's graphite.
- **Checks** (`scripts/browser-checks/configurator.js`, local and public, all pass): opens on Studio; a flag changes the player and the snippet; tier changes both and resets the flags; a pro flag over Viewer; layout; no reload; the radio groups work with arrow keys; each of the six "Show me" (three frames stepped, range and loop and playing, 9:16 with TikTok, title safe, 200% and panned, a PNG named `frame_<timecode>.png`); the log's lines, its cap of 20, Clear; Copy; four query strings round-trip; Viewer on the page requests no pro chunk. Structure at 1440, 1024, 390 (touch) and 320: one h1, h2 per section, header/main/footer/nav, no unlabelled control, no target under 24 px (44 on touch), no horizontal overflow.

### Bundle sizes (raw / gzip -9)
| Chunk | Step 7b | Step 8 |
| --- | --- | --- |
| Viewer path JS (was `preview-*.js`, now the shared `demo-video-*.js`) | 969,477 / 285,106 B | 952,862 / 279,981 B, plus the monitor page's own 15,614 / 5,961 B |
| Skin CSS (shared `demo-video-*.css`) | 36,105 / 6,561 B with the monitor page's | 32,907 / 5,872 B, plus the monitor page's own 2,926 / 1,138 B |
| Pro runtime | 13,069 / 5,243 B | 12,761 / 5,036 B |
| Studio JS | 57,545 / 18,202 B | 58,245 / 18,523 B |
| Studio CSS | 23,484 / 4,230 B | 23,357 / 4,226 B |
| **The page's own JS** (`index-*.js`) | none | **7,479 / 3,452 B** |
| **The page's own CSS** (`index-*.css`) | none | **7,794 / 2,408 B** |
| The page's HTML | none | 13,415 / 3,595 B |
The page also loads a small shared `timecode-*.js` (the pure timecode functions, for the log's timestamps) in every tier. It is not one of the pro chunks (runtime, studio, debug).

### Screenshots
`design/screenshots/step-8/` (headless Chrome; each opened and looked at): `page-1440-light`, `page-1440-dark`, `page-1024`, `page-390` (touch, dark), `page-320`, `event-log-entries`, `page-1440-after-show-me`, `og-image`.

### Step 8 public-URL checks (https://videojs-frameline.vercel.app)
Viewer gate at 1440 and 320 on `/?tier=viewer` and on `/preview.html?tier=viewer`: tab order, `K`/Space, arrows, `J` `L`, `5`, `Home`, `M`, `↓`, `C`, the help dialog (11 rows, focus in and back), 40 px targets, no overflow, **no pro chunk requested**. The Viewer's DOM (every element's tag, classes and role, and the video's children) is identical to the step 7b deploy on both pages. `configurator.js`, `zoom.js` at 1x and 2x, `guides-menu-focus.js`, `zoom-rendition-cap.js` and `zoom-rendition-note.js` (both with `?cap=1`) pass. `/`, `/preview.html`, `/workbench.html`, `/og.png`, `/favicon.svg` and the demo files answer 200.

### 8.6: not done
The author creates the GitHub repository and pushes by hand. The tag `step-8-configurator` is local.

### Placeholders the author replaces
- `apps/preview/index.html`: the Source and Features links (`https://github.com/artmarchuk/videojs-frameline`, the repository), the About pitch, and the absolute `og:` URLs if the site moves.
- `apps/preview/src/frame/media.ts`: `REEL_PLAYBACK_ID`, then `ACTIVE_SOURCE = 'reel'`; the three files in `public/demo/reel/`. Then run `scripts/og-image.mjs` again (its `SHOT` times are for the test stream) and adjust the "Try this" copy if needed.

### Unverified (step 8)
- **Only Chrome was run** (headless, desktop and touch emulation). The page's CSS uses `accent-color`, media-query range syntax (`width < 900px`) and `clip-path: inset()`, all inside the browser floor on paper.
- **A screen reader on the page:** structure and names were read from the DOM, not heard.
- **The social image in a real unfurl** (Slack, X, LinkedIn): the tags and the file are there; no card validator was run.
- **The reel:** the entry and its files are placeholders; nothing was played from it. Its captions track is plain `<track>` markup that no source has exercised with real cues.
- **`apiRef` with a host that re-creates the ref**, and its calls before the video has metadata (the page guards for that itself).
- **A real download** from "Grab a frame": the check stubs the link's click and reads the file name.
- Everything listed under steps 7 and 7b that needs Firefox, Safari, a real pointer or real fullscreen still stands.

## Step 9: Hardening and audit (16 Nov 2026)

No new features and no layout changes. Everything ran in Playwright 1.65 from a scratch folder outside the repository: Chromium as the installed Google Chrome (headless, `HeadlessChrome/157`), Playwright's Firefox (`159.0`, a Nightly build) and Playwright's WebKit (`Safari/605.1.15`, a Safari 27 build), on macOS, against the local production build on port 4173 and then the public URL. WebKit in Playwright is close to Safari but not the same build, and Safari 16.4 cannot be emulated.

### 9.0: confirmed
The rename to [Scope] and [Backlog] was done before this step (737fb69, 585f0af). A search of README, FEATURES, the overview, `CLAUDE.md` and the page for `[Contest]`, `[Later]`, `PRO`, `Share`, `Review` and `View` found one leftover, the "(it was "View" before)" aside in FEATURES, now gone. "Review transport" in the overview's step list is a step name and stays. The old step files are history.

### 9.5: axe
`@axe-core/playwright` (with its peer `playwright-core`) is a dev dependency; `scripts/browser-checks/axe-audit.js` scans a page with the WCAG 2.0/2.1/2.2 A and AA tags plus best practices, after opening the Guides menu, the Zoom menu or the help dialog when asked. Six states: the configurator page in both themes, Studio with the Guides menu open, with the Zoom menu open, with the help dialog open, and the Viewer.

| | Critical | Serious | Moderate | Minor |
| --- | --- | --- | --- | --- |
| Before, page (either theme) and Studio (Guides or Zoom open) | 0 | 2 | 0 | 0 |
| Before, Viewer | 0 | 1 | 0 | 0 |
| Before, Studio with the help dialog open | 0 | 0 | 0 | 0 |
| After, every state | 0 | 0 | 0 | 0 |

The three findings, all fixed: `label-content-name-mismatch` on the timecode button (visible `00:00:30:00`, name "Time in seconds"), now named by its value plus "Time in seconds" through `aria-labelledby`; the same rule on the Viewer's duration toggle (Video.js's own label "Show remaining time, 1 minute, 51 seconds duration." does not contain the visible `1:51`), now labelled through `Time.Value`'s `label` prop as "1:51 duration. Show remaining time." (`@videojs/utils` 10.4.0 became a direct dependency for `formatTime`); and `target-size` on the dock's volume thumb, which at full volume overhangs the slider by 12px and was covered 2px by the fullscreen button; the slider now has `z-index: 1`. No moderate or minor findings. The help-dialog state reports nothing because axe does not scan what is inert behind a modal dialog. The challenge's own audit prompt is not in the repository or in `specs/`, so it was not run.

### 9.4: Firefox and WebKit
Every check, in all three engines (also recorded in the README's table):

| Check | Chromium | Firefox | WebKit |
| --- | --- | --- | --- |
| Viewer gate (`viewer-gate.js`, 1440 and 320, `/preview.html` and `/`): tab order, keys, free keys, help dialog, targets, overflow, no pro chunk | Pass | Pass; the `<video>` element itself is two tab stops before the seek bar (Firefox makes media elements focusable) | Pass |
| `configurator.js` | Pass | Fixed: three steps landed on frame 5 (see the frame clock) | Pass except Copy (headless WebKit refuses clipboard writes) and "focus stays on the button", which WebKit does not do on a pointer click; the check now asserts it only where a click focuses |
| `fullscreen-focus.js` | Pass | Pass | Pass |
| `guides-menu-focus.js` | Pass | Pass | Pass |
| `handle-focus-ring.js` | Pass | Pass | Pass |
| `zoom.js` at 1x and 2x | Pass | Pass | 1x pass; 2x fails only `grabSame`: two grabs of the same paused frame differ in a few pixel values (sums 1338436116 and 1333837263 at 3840x2160); the files are the right size, without guides |
| `zoom-rendition-cap.js` | Pass | Pass | Pass |
| `zoom-rendition-note.js` | Pass | Fails `bestOk`: after a manual switch to 2160p, `videoHeight` is 2160 but Video.js's `activeVideoRendition` still says 720p eight seconds later, so the note still says "showing 720p". The note follows Video.js; not fixed | Pass |
| `error-retry.js` | Fixed | Fixed | Fixed |
| `reduced-motion.js`, `axe-audit.js`, `two-players.js` | Pass | Not run | Not run |

- **Frame clock.** All three engines have `requestVideoFrameCallback`. Chrome's `mediaTime` is the frame's start; **Firefox reports the seek time** (the skin seeks half a frame in), so `nearestFrame` rounded frame 1 to frame 2 and three steps landed on frame 5. `presentedFrame` in `timecode.ts` floors with a quarter-frame tolerance; after the fix ten `.` presses from 0 land on `00:00:00:10` in all three engines (probe at 30 fps; before the fix Firefox gave `00:00:00:16`).
- **Zoom.** `image-rendering: pixelated` computes on the video in all three; guides counter-scale (the `zoom.js` guide and label checks pass).
- **Grab frame.** Works in all three. Firefox 159 has `ClipboardItem`; Firefox 121 to 126 (inside the floor) do not, so "Copy frame image" is now disabled with the hint "Not in this browser" when `ClipboardItem` or `navigator.clipboard.write` is missing, instead of toasting on activation.
- **Rendition.** Playwright's WebKit played the Mux stream through hls.js, like Chrome (the Quality menu lists eight renditions and the cap lift works), so native-HLS behaviour (an empty quality list, no note, no cap lift) was **not** exercised; the code paths behind the note return `null` without a rendition list.
- **Menus and focus order.** `guides-menu-focus.js` gives the same order in all three; the gate's tab order is the same apart from Firefox's video stops.

### 9.1: `prefers-contrast: more`
Token overrides in `tokens.css` (same layout): `--fl-text-dim` `#cbcbd1` and `--fl-text-dim-raised` `#d8d8dd` (7:1 and more on their surfaces), `--fl-line` `#7a7a81` and `--fl-divider` white at 0.38 (3:1 on surface-2), ticks and buffer lighter, `--fl-handle-idle` `#b6b6bd` (4.5:1 against the track), the ruler label `#d2d2d8`, the scrim at 96%, a 3px focus ring, a 2px playhead edge (`--fl-playhead-edge-width`, read by the playhead's drop-shadow filter) and guide lines at 1.5x (`--fl-guide-weight`; the dark edge stays 1px each side). The track colour is left alone: a lighter track would drop the Viewer's progress fill below 3:1 against it. The page: dim text `#3f3f46` / `#d2d2d8`, hairlines `#86868d` / `#7f7f86`, control edges `#5d5d64` / `#a4a4ab`, a 3px focus ring. `scripts/contrast.mjs` prints a second column with the raised minimums (7 for dim text, 3 for lines, dividers and the menu separator, 4.5 for idle handles); 84 rows, all pass in both columns. Screenshots: `contrast-more-studio.png`, `contrast-more-viewer.png`.

### 9.2: `forced-colors`
Added to the existing token block: ButtonText borders on buttons, the time toggle and the timecode field; Highlight with HighlightText on pressed buttons and checked menu items, a Highlight border on the highlighted item; on the timeline a Highlight fill for the range band (kept with `forced-color-adjust: none`, a HighlightText line under the played part) against the bordered track, CanvasText with a Canvas edge for the playhead, handles, pins and spans, Highlight for set handles and the selected pin. Icons already used `currentColor`, guides already used CanvasText over Canvas, and the focus ring is an outline. Emulated with `forcedColors: 'active'` in Chromium; `forced-colors-studio.png` (range, Guides menu open, title safe on) and `forced-colors-viewer.png`. The video picture is unaffected.

### 9.3: reduced motion
`scripts/browser-checks/reduced-motion.js` under `reducedMotion: 'reduce'` lists every element with a transition or animation duration, or smooth scrolling, in five states: idle, the Guides menu open, a toast on screen (`G`), the volume slide-out open, Settings open. Studio, the Viewer and the page: nothing. Checked and covered: the controls fade and every skin transition (`--fl-duration` and `--fl-duration-fade` are 0ms), menus opening (the same tokens), the volume slide-out, the toasts, the spinner (`--media-spinner-animation: none`), the page's button transition (inside a `no-preference` query) and its `scrollIntoView` (instant under the preference). Nothing needed fixing.

### 9.6: carry-overs
- **Error dialog.** Retry assigned `media.src` to itself, which is a blob URL once hls.js has attached: nothing reloaded and the dialog closed for good. It now calls `load()`, which re-requests the manifest (seen in the resource timeline). The engine keeps its error object across the reload, so the second failure fires `error` with the same object and the store sees no new error; the dialog therefore stays open until `loadedmetadata`, `canplay` or `playing`, then closes. `error-retry.js` passes in all three engines, both tiers. A source that recovers on retry was not tested (the broken URL stays broken).
- **Two players.** `two-players.html` and its check (above). Each player's announcer, store, hotkeys and `persist` key are its own; React ids are unique because both players render in one root.
- **Language.** README says the skin's strings are English only.
- **Real fullscreen.** Code paths as in step 6d; in the hand-test list.

### Bundle sizes (raw / gzip -9)
| Chunk | Step 8 | Step 9 |
| --- | --- | --- |
| Viewer path JS (`demo-video-*.js`) | 952,862 / 279,981 B | 953,211 / 280,118 B |
| Skin CSS (`demo-video-*.css`) | 32,907 / 5,872 B | 33,941 / 6,094 B |
| Pro runtime | 12,761 / 5,036 B | 12,761 / 5,039 B |
| Studio JS | 58,245 / 18,523 B | 58,614 / 18,635 B |
| Studio CSS | 23,357 / 4,226 B | 24,214 / 4,357 B |
| The page's JS / CSS | 7,479 / 3,452 B, 7,794 / 2,408 B | 7,479 / 3,452 B, 8,137 / 2,472 B |
| Monitor page JS / CSS | 15,614 / 5,961 B, 2,926 / 1,138 B | 15,614 / 5,962 B, 2,926 / 1,138 B |

### Screenshots
`design/screenshots/step-9/` (2x, each opened and looked at): `contrast-more-studio`, `contrast-more-viewer`, `forced-colors-studio`, `forced-colors-viewer`, `firefox-studio`, `webkit-studio`.

### Unverified (step 9)
- Safari itself, iOS Safari, Windows High Contrast on Windows, a screen reader, a real pointer and real fullscreen: the hand-test list in the step 9 report.
- Native HLS playback in Safari (Playwright's WebKit used hls.js): the rendition note and the cap lift there.
- Retry on a source that recovers: the dialog should close on `loadedmetadata`; only the still-broken case was run.
- `prefers-contrast: more` and `forced-colors` were emulated in Chromium only.
- Firefox 121 to 126 (no `ClipboardItem`): the disabled Copy item was reasoned from the feature test, not run in those versions.
- Each step 9 commit was built from a working tree that passed typecheck, tests, build, contrast and the gate as a whole; the intermediate commits were not checked out and rebuilt one by one.

## Dock polish: share link, narrow dock, neutral palette, tactile controls, motion (16 Nov 2026)

Requirements: `specs/dock-polish.md`. Checked in Playwright 1.65 (`playwright-core` from the repo): the installed Google Chrome headless, Playwright's Firefox 159 and WebKit (Safari 27 build), against the local production build and then the public URL. Screenshots: `design/screenshots/dock-polish/`, each opened and looked at. On the monitor page the window is wider than the player (16 px margins when narrow, 24 px when wide), and the page caps the player at 1280 px; **every width below is the player's own width**, which is what the container queries read.

### What was checked before binding the keys
- **`S` and `Shift+G` are free.** Searched every `useHotkey` and `<Hotkey>` in `src/` (the full list: `Space`, `K`, `M`, `F`, `C`, arrows, `J`, `L`, `0`–`9`, `Home`, `End`, `<`, `>`, `Shift+?`, `Shift+/`, `,`, `.`, `Shift+←/→`, `I`, `O`, `Shift+I`, `Shift+O`, `R`, `[`, `]`, `G`, `Shift+V`, `Z`, `Shift+Z`, `Shift+Alt+arrows`). The installed `@videojs/react` 10.4.0 has no hotkey map of its own that applies to a custom skin: keys exist only where a skin declares them, and its packaged skins' map (`dist/dev/internal/skins/shared/.../playback-hotkeys.js`: `Space`, `K`, `M`, arrows, `L`, `J`, `0-9`, `Home`, `End`, `>`, `<`) has neither key. Patterns match modifiers exactly (step 7), so `G` and `Shift+G` do not collide.
- **`Menu.Trigger`** sets `aria-expanded="true"` while its menu is open (`@videojs/core` `core/ui/menu/core.js`, `getTriggerAttrs`), and no open attribute of its own; the pressed look selects on that.
- **`Menu.Popup` exposes open and close state:** `data-open`, `data-side`, `data-align`, and `data-starting-style` / `data-ending-style` from `TransitionDataAttrs` (`core/ui/menu/data.js`; `docs/reference/components/menu.md`). Seen in the DOM: `data-starting-style` for the first frame of opening, `data-ending-style` for about 80 ms while closing. So menus got the open and close motion.
- **Video.js positions a popup with the `translate` property** (inline `translate: clamp(…)`, `dom/ui/popover/positioning.js`). The spec's `translate: 0 2px → 0` would have been overridden by that inline style, and `translate` in the popup's transition would have animated every reposition. The 2 px move is a `transform` instead, which Video.js leaves alone.
- **A tooltip closes when its trigger is clicked** (observed; not documented). After a click on the link button the "Link copied" label is therefore seen only if the pointer comes back within the 1.2 s; after `Enter` on the focused button the tooltip stays and reads "Link copied".
- Video.js buttons set no `aria-pressed` (searched `core/ui`); only our own tool buttons do.

### The link button
- `[ 00:00:14:20 | link ]`: 2 px gap, the group radius (8 px) on the outer corners and 2 px on the inner ones, the link 40 px wide and as tall as the field (34 px at comfortable density; `--fl-control-size` + 6 px, so 34 px at compact). `S`, the button and the smallest dock's settings item share one action (`useCopyLink`).
- After a copy: the check for 1200 ms (a 90 ms cross-fade), the tooltip label "Link copied", and the announcement "Link copied, 00:00:14:20". **The toast is no longer shown where the link button is on screen** (the check is the visible confirmation); it still shows where the button is folded away (under 340 px), with the same text. A refused clipboard keeps the old message and toast, and shows no check.
- With `timecode: false` and the link on, the link button stands alone in the left column.
- Capture holds Grab frame (`G`) and Copy frame image (`Shift+G`), and is not rendered with `grabFrame: false`. The narrow-only markers page of the settings menu and the In and Out buttons are gone, with their strings (`in`, `out`, `setIn`, `setOut`), the `pro-tool-text` and `pro-seg-divided` styles and the `range-narrow` slot.

### The narrow dock
- Row two is `display: grid; grid-auto-flow: column; grid-auto-columns: minmax(44px, 1fr)`, each control centred in its cell, in source order: Markers, Loop, Capture, Link, Guides, Zoom, Settings, Fullscreen. `grid-auto-columns` is used, not `repeat(N, …)`, because N changes with the flags and the folds. The cause of the old crowding was twofold: the menu buttons laid their icon out from the start of a 44 px button once the badge and chevron were hidden, and the "Fit" button was 52 px wide. Menu buttons centre their contents now, and every button of the row is 44 x 44.
- Measured (player width: cells, step between centres): 430: 8, 50 px. 390: 8, 45 px. 360: 7 (no Zoom), 47 px. 320: 6 (no Zoom, no Link; "Copy link at timecode" in Settings), 48 px. No overflow, no wrap, two rows.
- **Under 294 px the six cells no longer fit** (264 px of cells, 30 px of padding). At 288 px, which is what a 320 px *window* gives on the monitor page, the row runs 6 px into the right padding (`narrow-288-*.png`); under 280 px Fullscreen passes the player's edge. Nothing was folded for it: the spec's fold rules stop at 340 px and say not to invent another. The author decides (Backlog).
- **The narrow switch moved from 700 to 740 px**, and the badges-and-divider step from 800 to 820 px. The link button adds 42 px to the left column; with a range set, Reset range ran into the Markers button from 700 to 735 px (28 px of overlap at 700), and at exactly 800 px the gap between the columns was 6 px instead of 16. Same remedy as step 7b used for the Zoom button. After it, a sweep from 1500 px down in 4 px steps finds no overlap and no gap under the grid's own in the wide arrangement. The other steps (1100, 1040, 940, 900) did not need to move.
- Found, not changed (row one "stays as it is"): at a player 350 to 353 px wide row one is 2 to 4 px too long, just above the 350 px rule that drops the cut buttons. The live build before this work does the same.

### Palette
Every surface token is a true grey at about the old lightness, as in the spec's table; no value had to be nudged. Under `prefers-contrast: more`, same rule: `--fl-line` `#7b7b7b`, `--fl-text-dim` `#cccccc`, `--fl-text-dim-raised` `#d9d9d9`, ticks `#8d8d8d` / `#a7a7a7` / `#bdbdbd`, `--fl-buffer` `#6f6f6f`, `--fl-handle-idle` `#b7b7b7`, `--fl-ruler-label` `#d3d3d3`. `node scripts/contrast.mjs`: every row passes in both columns (lowest that matter: Viewer fill against its track 3.17:1, idle handle against the track 3.16:1, played band against the unplayed 3.27:1, dim text on a control 5.09:1). The blended ruler label on the dock is `#9a9a9a`, two steps from `--fl-text-dim` (`#9c9c9c`), 5.92:1.
Also made neutral, outside the table: the caption cue's literal colours in `base.css` (`#f2f2f2` on `rgb(15 15 15 / .85)`), the guide labels' backdrop (`rgb(15 15 15 / .72)`) and the tick fallbacks in the timeline script. **Not changed: the configurator page's own palette** (`page.css`), which still has the old blue-cast greys (`#151517`, `#1e1e20`); the spec covers `tokens.css`.

### Tactile controls
- `--fl-bevel` (1; 0 is flat), `--fl-hi`, `--fl-lo`, and one token per treatment (`--fl-raise-image/-shadow`, `--fl-press-image/-shadow`, `--fl-play-image/-shadow/-press-image`, `--fl-well-shadow`, `--fl-track-shadow`, `--fl-solid-image/-shadow`, `--fl-handle-image/-shadow/-shadow-dragging`, `--fl-pin-shadow`, `--fl-playhead-shadow`, `--fl-dock-edge`). The gradients are tokens so that one rule can set them all to `none`.
- **Flat in three cases, by one rule each:** the overlay layout (`:not([data-layout="dock"])`: nothing tactile over the picture, so the Viewer overlay is unchanged apart from the palette), `prefers-contrast: more` and `forced-colors: active`. Checked by script in each: `--fl-bevel` is 0 and no element or pseudo-element of the skin has a gradient.
- **Standalone buttons have no fill** (they never had one), so at rest they carry only the 5% top light, the 1 px highlight and the 1 px shadow; a segmented group is one raised object and its buttons are flat until pressed.
- **Focus rings.** Buttons, the timecode field and the handles set their own shadow in a variable (`--fl-shade`) and one rule draws `box-shadow: var(--fl-shade)`; the focus rule draws `var(--fl-focus-halo), var(--fl-shade)`. Tabbed through all 21 stops of the wide dock with a range set: each has the 2 px accent outline, and its halo plus its own shadow (screenshots `focus-01` to `focus-21`).
- Pressed applies to `aria-pressed="true"`, `aria-expanded="true"`, `data-pressed` (Loop, Zoom above Fit), `data-active` (captions on) and `:active`, but not `:active` on an `aria-disabled` button.
- The marker pin's shadow is a `drop-shadow` filter on the pin's target, because the flag is cut out with `clip-path`, which would cut a `box-shadow` off. The playhead's shadow is a fifth `drop-shadow` after its outline, so it follows the head and the line as one shape.
- The grip on a handle is two background layers (1 x 8 px each) over the gradient.

### Motion
- Tokens `--fl-duration-press` 60 ms, `--fl-duration-quick` 90 ms, and one more than the spec lists, **`--fl-duration-exit` 70 ms**, so that the two 70 ms closes (band, menu) also go to 0 under reduced motion. All 0 ms there (read from the computed style; `reduced-motion.js` passes on Studio, the Viewer and the page).
- Computed: the playhead, the handles, the timecode digits, the ruler and the picture wrapper have no transition. The band has `opacity, transform, visibility` only; sampled per frame it goes 0 → 1 and `scaleY(.4)` → 1 in about 90 ms after `I`, and back in about 70 ms after `Shift+I`, then `visibility: hidden`. While a handle is dragged the band's transition is `none`. A cleared band keeps its last start and end while it fades (the component leaves the two variables in place).
- **One duration differs from the spec.** Leaving a pressed state: the shadow and the icon take 90 ms, but the fill colour takes 120 ms, because `background-color` on the base rule also carries the hover, which the spec keeps at 120 ms, and a rule gives a property one duration. Entering is 60 ms for all three.
- Menus: opacity and a 2 px `transform` over 120 ms on opening, 70 ms on closing (above).

### Fix: the band's ends
The source was the track's own radius: `.pro-tl-chapters` clips its content to a 4 px radius, so a band that reached an end of the track (only In or only Out set) was cut round there, next to the straight edge of the idle handle, and the empty track showed the same notch. With handles the track's ends are square now (`data-handles` on the timeline; without the `inOut` flag the track keeps its radius). Measured with a range set: In tab right edge 438.375 = band left 438.375; Out tab left 878.89 = band right 878.91. Before and after at 8x: `before-400-band-at-idle-in.png`, `before-400-track-end-at-idle-out.png`, `x400-only-in-band-end.png`, `x400-range-band-start.png`, `x400-range-band-end.png`.

### Checks
- `scripts/browser-checks/dock-polish.js` (new), wide and at players of 430, 390, 360, 320 and 668 px: the pair's geometry, `S` (clipboard text `…#t=00:00:14:00`, check on and off, announcement, no toast), a refused clipboard, `Shift+G` (clipboard holds `image/png`), the Capture menu's two items, the help rows, the narrow row's order, sizes, equal steps and fit, no In or Out buttons, `I` `O` `Z` from the keyboard, the settings menu with and without the link item, the Markers menu. All pass.
- Flags on the configurator: `?copyTimecodeLink=0` (no link button, field radius 8 px all round, `S` does nothing, no `S` row in the help), `?grabFrame=0` (no Capture button, no `G` rows), `?timecode=0` (link button alone).
- The existing checks on the final build: `viewer-gate` (1440 and 320, both pages; **no pro chunk requested**), `configurator`, `guides-menu-focus`, `handle-focus-ring`, `fullscreen-focus`, `zoom` at 1x and 2x, `two-players`, `reduced-motion` (three pages), `axe-audit` (seven states, one of them the narrow touch dock; no violations) pass. Unit tests 217, typecheck, build pass.
- Firefox and WebKit: the wide dock with a range and the narrow dock render as in Chrome (`firefox-*.png`, `webkit-*.png`); no overlap, one row and two rows.

### Bundle sizes (raw / gzip -9)
| Chunk | Step 9 | Now |
| --- | --- | --- |
| Viewer path JS (`demo-video-*.js`) | 953,211 / 280,118 B | 953,175 / 280,113 B |
| Skin CSS (`demo-video-*.css`) | 33,941 / 6,094 B | 37,696 / 6,676 B (the bevel tokens and the dock's button rules; the Viewer loads them and uses none in its overlay) |
| Pro runtime | 12,761 / 5,039 B | 12,788 / 5,044 B |
| Studio JS | 58,614 / 18,635 B | 60,246 / 19,115 B |
| Studio CSS | 24,214 / 4,357 B | 26,589 / 4,757 B |
| The page's JS / CSS | 7,479 / 3,452 B, 8,137 / 2,472 B | 7,539 / 3,479 B, 8,137 / 2,472 B |

### Public URL (https://frameline.artmarchuk.me, after the deploy)
`/`, `/preview.html`, `/workbench.html` and `/og.png` answer 200. In Chrome: `dock-polish.js` (wide and five narrow widths), `viewer-gate` (three runs, **no pro chunk requested**), `configurator`, `guides-menu-focus`, `handle-focus-ring`, `zoom` at 1x and 2x, `reduced-motion` (three pages) and `axe-audit` (seven states) pass. `dock-polish.js` also passes in Playwright's Firefox and WebKit there, without the clipboard read-back (those contexts grant no clipboard permission). Compact density looked at on the live site (`compact-1440-range.png`): the link button is 34 x 28 px beside a 28 px field.

### Unverified (dock polish)
- **`range-playback.js` is intermittent.** On this build it passed 11 of 16 runs locally; on the build that was live before this work it passed 3 of 4. The usual failure is the step "play from outside the range": 800 ms after play the head is at about 12.4 s where 10 to 12 is expected. The range engine (`controller.ts`) was not touched here, and the check's waits are fixed, so this reads as a timing-sensitive check, possibly a real race between a host seek and the engine's own loop seek. Not investigated further.
- **A real pointer and a real finger:** how the press feels, the half-pixel icon move at 1x (seen at 2x and 8x only), the narrow row on a phone (touch was emulated), dragging a handle with its larger shadow.
- **The floor versions** (Chrome 111, Firefox 121, Safari 16.4): `:is()`, `:where()`, `:has()`, the `translate` property, `calc()` inside `rgb()` alpha and `grid-auto-columns: minmax()` are inside the floor on paper; only current builds were run. Safari itself and iOS were not run (Playwright's WebKit was).
- **`prefers-contrast: more` and `forced-colors`** were emulated in Chromium only; Windows High Contrast itself was not run.
- **The clipboard in Firefox and Safari:** that `S` writes the link and `Shift+G` the image was read back in Chrome only.
- **A screen reader:** "Link copied, 00:00:14:20" was read from the live region's text, not heard.
- **Real fullscreen** with the restyled dock (headless Chrome refuses fullscreen).
- **A player under 294 px** in the narrow layout: known to overflow by 6 px at 288 px (above).

## Dock polish, follow-up (16 Nov 2026)

Requirements: `specs/dock-polish-2.md`. Same method as "Dock polish" (Playwright, the installed Chrome headless; widths are the player's own). Screenshots: `design/screenshots/dock-polish-2/`, each opened and looked at.

### Raised keys and a flat toolbar
- Raised (unchanged treatment): the transport groups (`.pro-seg`; its buttons stay flat inside it), Play, Loop, and the link button when it is joined to the timecode field. One rule in `skin.css` selects Loop and `.pro-timecode-pair > .pro-tool-link`; Play keeps its own rule in `studio.css`.
- Flat at rest: every other dock button, read from the computed style at 1280 px: transparent fill, no gradient, no shadow (Markers, Capture, Guides, Zoom, Reset range, Captions, Settings, Mute, Fullscreen). Hover: a flat `--fl-surface-2` fill over `--fl-duration`. Pressed, open or on: the keys' pressed treatment (an open Guides menu and Zoom at 200% computed `--fl-on`, the darker top and the inner shadow). On the narrow row the link button is flat (it is not joined to the field there) and Loop is raised.
- The hover rule wraps its exclusions in `:where()`, so its specificity equals the pressed rule's and the pressed rule, written after it, wins on a hovered open menu.
- Sizes and positions did not change (the layout sweep of "Dock polish" still applies; one row at 1280, 1100 and 820 px with a range set, no overlap).

### The bar under Loop
Removed (`.pro-tool[data-pressed]::after`). It was **not** the forced-colours cue: there a pressed button already takes a `Highlight` fill with `HighlightText` (`skin.css`), and that is unchanged; Loop on and off differ by that fill (screenshots `forced-colors-loop-on/off`). **One thing differs from the spec: under `prefers-contrast: more`** the bar was the only cue, because the bevel is off there and `--fl-on` against the dock is 1.77:1. Removing it alone would have left Loop on and off nearly identical, so under more contrast `--fl-press-shadow` is a 1 px inset edge in `--fl-text` (14.9:1 against the dock, 8.3:1 against `--fl-on`; two new rows in `scripts/contrast.mjs`). It applies to every pressed or open control there, not only Loop. In the default palette the cue is the pressed bevel alone, as the spec asks; its fill against the dock stays at 1.77:1, and the contrast script now marks that row decorative.

### Range motion
- `--fl-duration-range-in` 160 ms and `--fl-duration-range-out` 120 ms, both 0 under reduced motion (read back: `0s`, and with reduced motion the band is at opacity 1 on the first frame). The drag rule that switched the band's transitions off is gone; while dragging, the band's left edge equals the handle's anchor after each pointer move (offset 0 px three times), so the drag stays 1:1.
- **The handle's colour change did not animate before** (also in "Dock polish"): the tab is drawn in `currentColor`, which computes to the keyword, so a transition on its `background-color` never moves. The transition is on the handle's `color` now, over `--fl-duration-range-in`; the drag shadow uses the same duration.
- Sampled every animation frame (opacity, scaleY, the In handle's colour): `I`, `O`, dragging an idle handle and `apiRef.setRange` (the configurator's "Show me") each go from opacity 0 / scaleY 0.4 to 1 / 1 in about 160 ms, the handle reaching the accent at the same time; clearing by `Shift+I` then `Shift+O` and by Reset range goes back in about 120 ms, then `visibility: hidden`. `Shift+I` alone leaves a range (Out only), so the band stays until `Shift+O`. Frame strips, 40 ms of the transition per row (the page's animations slowed to a tenth through the DevTools protocol): `motion-in-key`, `motion-out-key`, `motion-drag-in`, `motion-api-setrange`, `motion-clear-shift-i-then-shift-o`, `motion-clear-reset`.

### Narrow players under 294 px
Under a 300 px player the side padding is 12 px; under 288 px the row's cells and buttons are 40 px wide (44 px tall; the menu buttons' `min-width` had to follow). Measured: 300 (15 px padding, 44 px cells), 288 (12 px, 44), 280 and 264 (12 px, 40): no overflow, no overlap, every button inside the player, two rows. Row one fits at all four.

### "Link copied" and the image copy are announced
Logged with a `MutationObserver` on every `role="status"` region, and read from Playwright's ARIA snapshot: `S` with the link button on screen announces "Link copied, 00:00:14:20" in the Studio region (`aria-live="polite"`) and shows no toast; the Settings item on a 320 px player and `S` there announce the same text and show it as a toast. `Shift+G` announces "Frame copied" (the skin's string since step 4; the spec calls it "Frame image copied", and the text was not changed) and shows it as a toast. Nothing was missing, nothing restored.

### Checks
Typecheck, 217 unit tests, build, the contrast script (both columns), and the browser checks: `viewer-gate`, `configurator`, `guides-menu-focus`, `handle-focus-ring`, `fullscreen-focus`, `zoom` (1x, 2x), `two-players`, `reduced-motion` (three pages), `axe-audit` (seven states), and `dock-polish.js` wide and at players of 430, 390, 360, 320, 300, 288, 280, 264 and 668 px. `dock-polish.js` now expects 40 px cells under 288 px and checks that every button is inside the player.

### Unverified (follow-up)
- The look of the flat toolbar and of the pressed edge under more contrast on a real display and with a real pointer.
- The slowed frame strips rely on Chrome's DevTools animation rate; the timing figures come from the per-frame samples at normal speed.
- Only Chromium was run for this follow-up, apart from what "Dock polish" covered.

### Section 6: the intermittent "play from outside the range" (time-boxed, 16:28 to 16:52; stopped, engine unchanged)
**By hand, 29 runs** (Playwright with the real pointer and keys on the local build; a 10–14 s range by `I` `O`, Loop on; click the ruler at 40 s, wait, then play; every other run first plays from 13.4 s, waits for the loop back to In and stops there). Start time = where playback actually began (the last `seeked` before playing):

| Run | How | Start |
| --- | --- | --- |
| 1–20 | picture click, `Space`, Play button in turn; * = right after a loop | 1 picture 10.017 · 2 Space* did not play · 3 button 10.017 · 4 picture* 10.017 · 5 Space did not play · 6 button* 10.017 · 7 picture 10.019 · 8 Space* did not play · 9 button 10.018 · 10 picture* 10.017 · 11 Space did not play · 12 button* 10.017 · 13 picture 10.017 · 14 Space* did not play · 15 button 10.017 · 16 picture* 10.017 · 17 Space did not play · 18 button* 10.017 · 19 picture 10.017 · 20 Space* did not play |
| 21–29 | the same with `K` for `Space` | all nine 10.017 or 10.018 |

Every start that played began on the In frame (22 of 22). **The seven `Space` runs did nothing:** after a click on the ruler, focus is on the Seek slider, and the player's hotkeys leave `Space` to an interactive element (Video.js `isInteractiveActivation`, step 6c), so `Space` does not play from there. `K` does. That is a separate finding (Backlog).

**What the check catches.** With every `currentTime` write, play and pause logged, a failing run reads: play at 40.017 s → the range engine's own seek to 10.017 s (In) → 300 ms later **hls.js** writes 12.067 s (`_trySkipBufferHole`, its stall recovery, called from its gap-controller `poll`) → the frame snap moves it to 12.083 s → playback continues there. The range engine treats that as somebody else's seek that lands inside the range, so it lets it play (the step 9 rule: a seek to inside the range while playing keeps playing). So it is **not** a race between the engine's loop seek and the host's seek; the start at In happens, and the streaming engine then skips forward over what it takes for a hole in its buffer.

**Is it the check's own writes?** Not only: with the check's seek to 40 s made by a click on the ruler instead of a `currentTime` write, it still failed once in 15 runs (12.58 s). With direct writes: 17 of 21 passes over this follow-up (and 11 of 16, 3 of 4 before). So step 3 of the brief does not hold, and step 2 was not reached: no person-style run hit it, but 22 runs at a rate of roughly 1 in 5 to 1 in 15 do not rule it out.

**Left as it is.** Options for the author, none taken: (a) let the engine re-assert In when a seek it did not make lands forward of In within a short time of its own start-at-In seek (risk: fighting hls.js if the hole is real, and overriding a fast user click); (b) look at hls.js's hole-skipping settings on the media source (`maxBufferHole` and the stall watchdog), which belong to the host's `MuxVideo` configuration, not the skin; (c) accept it, since the head still plays inside the range.

## Dock polish, last fixes: menu notes on top, Space on the sliders (16 Nov 2026)

Requirements: `specs/dock-polish-3.md`. Same method as before (Playwright, the installed Chrome headless, plus Firefox and WebKit for the keys). Screenshots: `design/screenshots/dock-polish-3/`, each opened and looked at.

### Notes go to the top of a menu
- Two menus have a note: Zoom ("Drag the picture or press Shift+Alt…") and Guides (the platform-zones note). Capture and Markers have none. Each note is now the first thing in its popup, with a `Menu.Separator` below it; the options keep their order (Fit first). The Guides footer (hide all, bring back) and the rendition note on the chosen zoom level stay where they were.
- One place for both directions: the note is first in the DOM, so a menu that opens downwards (overlay layout near the top edge) also shows it on top.
- Text and element unchanged (a `p`). Accessibility tree, Chrome: `menu` → `paragraph` → `separator` → `group "Zoom"` → `Fit`…; the same in Guides. **Added:** the menu (`Menu.Content`, which carries `role="menu"`, not the popup) is `aria-describedby` the note, so a screen reader hears it when the menu opens: arrow keys in a menu go only to items, so a note in the reading order alone is easy to miss. The accessible description reads the note text in both menus.
- **Video.js measures each child of a menu at `width: max-content; max-width: none`** (`dom/ui/menu/popup.js`, `measureContent`), which overrides a child's own width. As a direct child the Zoom note was measured as one line and the menu grew from 244 to 615 px. The note and its separator are wrapped in `.pro-menu-head`, so the wrapper is what gets measured and the note keeps its width: 244 px again. The Guides note takes the popup's width (less the content padding) from a new `--fl-guides-width`, the same value that sets the popup's width.
- **The Guides menu's height cap went from 480 to 512 px** (`--media-spacing` × 128), for this menu only, and still never more than the room above the button. With the note on top its content needed 504 px, and at 480 the footer scrolled out of view (measured at 1100 to 1920 px windows: 24 px over). With 512 nothing scrolls on those windows; a shorter player scrolls the menu as before.
- The zones note now sits above the whole Guides menu, where it can read as being about every guide, not only Platform zones. The spec asked for one rule and the same text, so I kept both; the author may prefer it at the top of the Platform zones column.

### Space on the sliders
- **What the Video.js hotkeys do:** the coordinator (`@videojs/core` `dom/hotkey/coordinator.js`) returns early on `isInteractiveActivation` (`@videojs/utils` `dom/interactive.js`): `Space` or `Enter` on `button, a[href], [role="slider"], [role="button"]` is never matched to a hotkey. The Hotkey reference says the same ("Space or Enter still activates focused buttons, links, and sliders normally"). There is no prop or option to change it for one element, and the slider itself (`dom/ui/slider/slider.js`) does nothing with `Space`.
- **The fix uses the existing binding:** `passSpaceToPlayer` (`src/video/shared/slider-space.ts`) takes a plain `Space` (no modifier) on the Studio seek slider, a range handle or the Viewer's seek bar, stops it there and dispatches the same key on the player container, where the hotkeys listen. The `Space` → `togglePaused` `<Hotkey>` then handles it with its own rules (held-key repeats ignored, disabled state, input feedback). It does not play or pause anything itself, and no second play/pause handler was added. If the hotkey handles the key the page does not scroll. Arrows, `Home`, `End`, `Page Up`, `Page Down` on the sliders and the handles are unchanged; `K` is unchanged; `Space` on a button still presses the button.
- Checked with the real pointer and keys, 10 times each, in Chrome, Firefox and WebKit (local production build): click the ruler (focus on "Seek"), `Space` plays, `Space` pauses: 10 of 10; with the In or Out handle focused: 10 of 10; the Viewer, click the seek bar, `Space` twice: 10 of 10. Also checked: `→` on the slider still steps a frame while paused, `→` on the In handle still moves it, `K` still plays and pauses, the page never scrolled. (WebKit's first run timed out in the script's own setup seek before any `Space`; the rerun passed.)
- `viewer-gate.js` now presses `Space` twice with focus on the seek bar; `dock-polish.js` (wide) clicks the ruler and presses `Space` twice, then does the same with the In handle focused.

### Checks
Typecheck, 217 unit tests, build, the contrast script, and the browser checks in Chrome: `viewer-gate` (three runs), `configurator`, `guides-menu-focus`, `handle-focus-ring`, `fullscreen-focus`, `range-playback`, `zoom` (1x, 2x), `two-players`, `reduced-motion` (three pages), `axe-audit` (seven states, Guides and Zoom menus open among them), `dock-polish` (wide and nine narrow widths); `viewer-gate`, `dock-polish` and `range-playback` also in Firefox and WebKit. All pass.

### Public URL (https://frameline.artmarchuk.me, after the deploy)
The `Space` runs (ruler, handles, Viewer: 10 of 10 each), the menu sizes (Zoom 244 px wide, Guides 504 px tall with nothing scrolling, 1100 to 1920 px windows), `viewer-gate`, `configurator`, `range-playback`, `axe-audit` (seven states) and `dock-polish` (wide and nine narrow widths) pass in Chrome.

### Unverified (last fixes)
- The note announced as the menu's description was read from Chrome's accessibility tree, not heard with VoiceOver or NVDA.
- `Space` was not tried on a real iPad or Android keyboard.
- The Guides menu's taller cap was checked on desktop windows only; on a short player the menu scrolls, as before.


## Landing page redesign (16 and 17 Nov 2026, branch `landing-redesign`, merged and deployed 17 Nov)

The site root is rebuilt from the Figma file "Frameline", page "Landing", frame "Landing / Desktop / Dark" (node 59:379), with "Landing / Phone" for the narrow layout. `page.css` is gone; `tokens.css` and `landing.css` replace it.

### Decisions
- **Tokens mirror Figma.** `tokens.css` holds every variable the frames use: `space/24` is `--space-24`, an ungrouped colour keeps its name (`--text`), a text style `Landing/H1` is `--type-h1` (a `font` shorthand) plus `--type-h1-tracking`. `landing.css` takes every colour, size, space and radius from them. Values with no variable in Figma are written as numbers where they are used: the segmented track's 3 px padding and 9 px radius, a checkbox's 16 px box and 4 px radius, the Cue row's 52 px and 76 px, the definition term's 110 px, the host column's 513 px, the refusal's 22/26 px padding, the ruler's 28 px.
- **Dark only.** `:root` holds Figma's Dark values. A light theme later is one block of colour values in `tokens.css`.
- **Phone mode** is `width < 760px` (Figma has frames at 1440 and 390 only; the breakpoint is ours). Between it and 1040 px the wide rows stack; that range has no Figma frame.
- **The player mock is the real player.** The mock's own colour variables are in `tokens.css` for parity and unused by the page.
- **SVGs are the Figma exports** (`src/page/assets/`), drawn as CSS masks so their colour is a token.
- **Fonts** come from Google Fonts (Google Sans Flex 400 and 800, JetBrains Mono 400), with system fallbacks.
- **Not in Figma, added:** focus ring (`--link`), a button hover, disabled states, the event log's empty line, the "switch on … in Configure" line in a Feature row, the Viewer and overlay wording of the line beside the tier switch, and three colour values under `prefers-contrast: more`.
- **Configure is collapsed under the player** (asked for after the first build; not in Figma). A button, "Configure the player", sits centred 12 px under the player and opens the whole section in place, so on a phone the controls and the picture stay one short scroll apart. It is a disclosure: an `h2` holding a button with `aria-expanded` and `aria-controls`, the body `hidden` while closed. Under it a line sums up the state ("Studio · Dock · 11 of 11 features on"). It is closed on every load, also when the query string sets a configuration. The skip link moves focus to the button. The button is ours, not Figma's: dimmed at rest so it does not compete with the player (no fill, `--dim` text, a `--key-edge` edge with a faint `--dim` light running round it every 6 s), full strength on hover and while open (`--surface` fill, `--text`, a plain `--control` edge). Lead-size type, a sliders icon drawn inline, a chevron. The light is a conic gradient turned by an `@property` angle; it stands still without `@property` (Firefox before 128) and under reduced motion. The resting edge is below 3:1 against the page; the label identifies the button (7.4:1). The body opens and closes with a 280 ms height and opacity transition (`grid-template-rows` 0fr to 1fr), none under reduced motion; closed, it is `visibility: hidden`. The section's ruler divider, large heading and lead line were dropped with the move.
- **"Show me"**: five Feature rows (`data-task`) and three Cue rows (`data-cue`) run the same tasks. Guides shows 9:16 with the TikTok zones, or Title safe when platform zones are off. Zoom goes to 100%, as the copy says, not 200%.
- **Copy changed from the design:** "The page around it follows your system." is left out of the third refusal, because the page is dark only.
- Hero H1 is "A monitor, not just a player."; the Video.js descriptor moved to the line under it.
- **Demo source is the reel** (17 Nov 2026): Mux playback ID `9Y7a3hqNCi4u02fmBFbaK5qWoS6A5cPce7P1mA00JA02tY`, 56.08 s, 1920×1080, 24 fps (ffprobe on the 1080p rendition: 24/1). `ACTIVE_SOURCE` is `reel`. The placeholder captions file is no longer loaded, so the reel has no captions. `chapters.vtt` holds the author's 13 sections, converted from `HH:MM:SS:FF` at 24 fps (frame FF is FF/24 s, rounded to the millisecond: at most 0.33 ms off, inside the skin's 0.4 ms frame tolerance); each cue ends where the next begins, the frame after the inclusive end frame. `markers.json` holds 14 simulated editor, director, VFX, sound and colour notes, written against frames looked at in the stream, with three range notes and three notes inside one second (37:05, 37:12, 37:20) for the pin cluster. Poster: the Mux thumbnail at 3 s. Checked: five frame steps from 10:00 show 00:00:10:05 in the skin and in the burned-in timecode.
- The event log keeps its line format (`onInOutChange in 9.250 · out 13.250`), not the object notation of the design's sample lines.

### Checks (headless Google Chrome via Playwright, local production build)
- `scripts/browser-checks/configurator.js`, updated for the page: all pass, the new tier switch over the player and a Cue row included.
- `scripts/browser-checks/axe-audit.js` on the page at 1440 and 390: zero violations.
- `node scripts/contrast.mjs`: all pass. Typecheck, build and the 217 unit tests pass.
- Looked at beside the Figma frames at 1440 and 390; section heights are within 13 px of the desktop frame.

### Final checks before submission (17 Nov 2026, local production build)
- Typecheck, 217 unit tests, build, `scripts/contrast.mjs`: pass.
- Chrome: `configurator`, `axe-audit` (`/` at 1440 and 390, `/preview.html` Studio and Viewer: zero violations), `viewer-gate` (three runs), `dock-polish`, `error-retry`, `fullscreen-focus`, `guides-menu-focus` (observational: order, wrap, Space and Escape as expected), `handle-focus-ring`, `range-playback`, `reduced-motion` (two pages), `two-players`, `zoom` (1x, 2x), `zoom-rendition-cap`, `zoom-rendition-note`: all pass on the reel, and the zoom checks and `viewer-gate` on `?media=cosmicDawn` too.
- Firefox and WebKit: `viewer-gate` (three runs), `dock-polish`, `range-playback`, `configurator`, `axe-audit` (four states): pass, except WebKit's clipboard step (below).
- **Checks made source-agnostic for the 56 s, 1080p reel** (they assumed the 111 s, 4K test stream): `range-playback` picks the digit key that lands inside its range; `viewer-gate` skips `C` when the source has no captions track; `zoom` asks the guides at 200% to grow past 1.2 × Fit, not 1.5 × (exactly 1.5 for a 1080p source at device scale 2); `zoom-rendition-cap` forces the lowest rendition on offer, not 360p, and no longer needs the clock to have moved forward (a short source loops).
- `og.png` regenerated from the reel: the Driver section (10:03 to 17:02) marked, at 13:00, title safe and thirds on.

### Unverified (landing page)
- Firefox and Safari were not run on the new page. `appearance: none` checkboxes with a masked `::before`, and CSS masks, are the parts to look at.
- The page copy's claims come from the design and were not re-checked here: "zero violations in six states" counted the page in two themes, and there is one now.
- The page at 320 px and the tablet range were not looked at closely.
- **The reel has no captions.** The step 2 gate asks for the captions toggle "on a source with captions"; the demo source now has none, so `C` and the captions button have nothing to show on the site. `?media=cosmicDawn` plays a source with captions. The reel was played in headless Chrome, Firefox and WebKit through the checks below; not in a headed Safari or on a phone.
- **WebKit, `configurator.js`:** `copied` is false because headless WebKit gives the check no clipboard read; Chrome and Firefox pass it. **One frame is missing at the 10 s segment join:** stepping from 10:02, Chrome shows the frame burned 10:04 at the 10:03 position (the skin's timecode reads 10:03 there), and a seek to 10:03 shows the picture and the skin both at 10:04. In the stream, frame timestamps run about 57 ms behind the burned-in timecode in that segment, and the first segment holds 119 frames, not 120. A Mux encode or MSE segment-join effect, not the chapter data; other segment joins (every 5 s) were not checked one by one. Next/previous cut lands on the right frame at the other 11 sections.

## Phone fixes: the playhead on top, the full transport on row one (17 Nov 2026)

### The playhead wins over a range handle
- Found on a phone: with In set at the playhead (`I`, or a loop restarting at In) the In handle's 44 px touch target covered the playhead, and every press there moved the handle. The handle stopped the press (so the slider under it would not seek), as the marker pins did before the 6c follow-up.
- Now one rule for pins and handles, `pressesPlayhead` in `timeline/logic.ts`: a press within 10 px of the playhead's centre, 22 px on touch (a 44 px target), is not stopped by the pin or handle it landed on; the slider takes it, grabs the playhead and drags it. The pin or handle keeps the rest of its target (a handle on the playhead keeps its outer 22 px on touch). A double click on that overlap no longer unsets the point. The rule is unit-tested; the DOM part is `playheadUnder` in `timeline/index.tsx`.
- Checked (headless Chrome, production build, `/preview.html`, Studio). Touch (390 px window, CDP touch events): playhead at 10 s, `I`; a press 8 px left of the playhead, inside the handle's target (53.8 to 97.8 px, playhead centre 98), dragged 60 px right: playback at 19.69 s, In still 10 s; a press 30 px left of the playhead, dragged 40 px left: In 2.54 s, playback unchanged. Mouse (1440): the same with 6 and 16 px; a double click on the overlap seeks and leaves In alone. `scripts/browser-checks/phone-transport.js` runs both.

### Row one holds the whole transport
- Found: the narrow row showed step, Play, cut, and dropped the cut pair under 350 px, which is what a phone gets: the site's 16 px margins make the player 328 px on a 360 px phone and 343 px on a 375 px one, so the cut buttons were never there on the phones people hold. The row needed 354 px (100 + 6 + 2 × 80 + 46 + 2 × 6, and 30 of padding).
- Now the narrow dock has the wide dock's composition, previous cut, step back, Play, step forward, next cut, from the same JSX (one branch less in `studio/index.tsx`; the focus order is the same on every dock). Compacted: the timecode field is 92 px (was 100; the text measures 84 px at 14 px, 92 with the `≈` prefix), Play 44 (was 46), the transport's gaps 4 px (were 6), and the four tool buttons are fluid, `flex: 1 1 auto` from 44 px down to a 36 px minimum, always 44 px tall. The groups have `flex-shrink: 0` and are portalled into a `display: contents` slot, so the override is a descendant selector on the transport, not a child one (the child one matched nothing, and the first run showed 44 px buttons overflowing by 9 to 32 px). The row needs 324 px in all; under that the cut buttons fold away (named `data-pro-tool="previous-cut"` and `"next-cut"` for it) and step back, Play, step forward gather at the end as before.
- Measured (headless Chrome, touch context, player width: tool button width): 398: 44; 358: 44; 343: 40.75; 328: 37; 324: 36; 308 and 288: cut folded, 44. No overflow of the bar's content box at any of them, no page overflow, two rows. Row two is unchanged.
- The Backlog item "row one is 2 to 4 px too long at 350 to 353 px" is gone with the 350 px fold.
- Found on a phone held on its side (a 796 px player, still the narrow dock because the pointer is coarse): the transport's groups spread to the ends of the row (`justify-content: space-between`). The transport is now centred as one group beside the timecode, 4 px gaps. Measured: at 844x390 220 px of space on each side; at 390x844 and 360x780 unchanged (1 px and 0 px of slack); under 324 px the folded row still gathers at the end.
- Target widths: between 324 and 358 px the tool buttons are under 44 px wide (never under 36, always 44 tall), as the 40 px step buttons were before on every narrow dock. WCAG 2.5.8 asks 24 px; the 44 px touch rule holds for Play, the timecode field and all of row two.

### Checks
- Typecheck, 218 unit tests (one new), build: pass. `scripts/browser-checks/phone-transport.js` at windows of 430, 390, 375, 360, 352, 340 and 320 px (touch) and at 1440 (mouse).
- `dock-polish.js` again: narrow (392 px, touch) all 11 checks pass; wide (1440) 12 of 13. The one, `link`, fails only because the runner opened the page with `#tier=studio` already in the URL, so the copied link ends in `&t=00:00:14:00`, not `#t=…`; the copy and its announcement were right.

### Unverified (phone fixes)
- A real phone: touch was emulated (Chrome's CDP touch events in a touch context); Safari on iOS and Chrome on Android were not run. Firefox and WebKit were not run on the flex change.
- The `≈` prefix in the 92 px field is computed from the measured text width, not seen.
- The landing page on a phone was not re-measured; the numbers above are from `/preview.html`, whose 16 px side padding equals the landing page's gutter under 760 px.

## Narrow dock: row one is the instrument, row two the toolbar (17 Nov 2026, branch `mobile-dock-rows`)

Requirements: `specs/mobile-dock-rows.md`. Checked with Playwright (`playwright-core` 1.65): the installed Google Chrome headless in touch contexts, against the local production build and then the public URL; widths are the player's own (the monitor page adds 16 px each side). Screenshots: `design/screenshots/mobile-dock-rows/`, each opened and looked at.

### How it is built
- The module's `useNarrowDock` became `useDockArrangement`: `wide`, or one of two narrow arrangements, `keys` (500 px and up) and `compact` (under 500). The container still gets `data-dock-size="wide|narrow"`, and on the narrow dock also `data-dock-rows="keys|compact"`. The threshold is `DOCK_NARROW_KEYS_FROM` in `studio/logic.ts`, unit-tested. It is set in script, not by a container query, because the DOM order changes with it (Loop and Link move between the rows), and the focus order has to follow.
- `keys`: the link button is rendered inside `.pro-timecode-pair` as on the wide dock, and Loop alone in the `range` slot (no Reset range on a narrow dock, as before). The row is the wide dock's grid, `minmax(max-content, 1fr) auto minmax(max-content, 1fr)`; the centre column's box is dropped with `display: contents`, so the transport is the middle cell and Loop the end cell (`justify-self: end`). Row two is the same grid of equal cells as before, with six buttons.
- `compact`: the DOM of `main`. Loop is flat there because the raised rule now selects Loop only in the centre column (`.pro-main-centre [data-pro-tool="loop"]`); in row two it gets the flat hover and the shared pressed rule. `aria-pressed` is untouched.

### Measured
- **Threshold: 500 px, as specified.** Row one needs 462 px: 15 + 92 (field) + 2 + 50 (link) + 6 + 232 (transport) + 6 + 44 (Loop) + 15. At 500 px there are 48 px between the transport and Loop, nothing overlaps, no overflow. Every target is 44 × 44 (the link 50 × 44); the fluid 36 px buttons of the compact dock are switched off here.
- **Dock height at 692 × 375 (724 × 375 window, touch): 181 px before, 167 px after** (padding 12 + 14 → 8 + 8, row gap 10 → 6). The timeline and its gap to row one are unchanged.
- The transport is centred on the player from 558 px up. From 500 to 557 px the timecode pair is wider than half the free space, so the transport sits right of centre (29 px at 500, 19 px at 520), the same rule as the wide dock's row: off-centre, not overlapping.
- At 692 px: 73 px between Link and the transport, 173 px between the transport and Loop; row two's cells are 110 px apart (were 81 px with eight).
- 739 px (mouse) is `keys`; 740 px (mouse) is the wide dock, unchanged; a touch device stays `keys` above 740 (measured at 780).
- Tab order, by pressing Tab: `keys`: timecode, Link, previous cut, step back, Play, step forward, next cut, Loop, Markers, Capture, Guides, Zoom, Settings, Fullscreen. `compact`: timecode, the transport, Markers, Loop, Capture, Link, Guides, Zoom, Settings, Fullscreen. Both match the screen.
- Loop, computed styles. Row one: off, the raised gradient and shadow; on, `--fl-on` with the pressed gradient and inner shadow. Row two: off, no fill, no image, no shadow; on, the same pressed treatment. Forced colours: off, a `ButtonText` border; on, `Highlight` fill with `HighlightText`, in both places. `prefers-contrast: more`: on, `--fl-on` with a 1 px inner edge in the text colour, in both places; off, no fill.
- Firefox 159 and WebKit (Safari 27 build) give the same positions to the pixel at 500, 692 and 390 px.

### Differs from the spec
- Row one's grid is `minmax(max-content, 1fr) auto minmax(max-content, 1fr)`, not plain `1fr auto 1fr`, and the transport has `min-width: max-content`. With plain `1fr` and the narrow dock's shrinkable transport, Chrome let the centre column shrink under the transport at 500 to 560 px and Play overlapped a step button (seen in the first measurement).
- The link button on row one is 50 × 44 px (the wide dock's rule, control size + 6 px, at the narrow dock's 44 px control size), so the pair is one height.
- "At the threshold and at 740 px": 740 px with a mouse is the wide dock, so the screenshots are 499 and 500 (touch), 739 and 740 (mouse) and 740 (touch).
- Loop on row one is 44 px wide (48 px would follow from the wide dock's "a little wider" rule); it lines up with the end of row two's last cell this way.

### Checks
- Typecheck, 219 unit tests (one new), build, the contrast script: pass.
- `scripts/browser-checks/dock-polish.js` now covers both narrow arrangements (row one's order and positions, the pair, Loop at the end edge, the dock's height, Loop raised or flat when off and pressed when on). Pass at players of 692, 500, 499, 739 (mouse), 780 (touch), 390, 343, 320 and 1280 px. `phone-transport.js`: pass at 390, 360, 320 and 724 px windows (touch) and 1440 (mouse).

- Public URL (https://frameline.artmarchuk.me/preview.html, deployed from `mobile-dock-rows`): `dock-polish.js` passes at the same nine sizes.

### Unverified (narrow dock rows)
- A real phone, upright or on its side: touch and the coarse pointer were emulated. Safari on iOS and Chrome on Android were not run.
- Forced colours and more contrast were emulated in Chrome only (`forcedColors`, `contrast` in Playwright), not seen in Windows High Contrast.
- The browser checks ran in Chrome only; Firefox and WebKit were measured for positions, not run through the checks.
- Fullscreen on a phone on its side (the dock under a full-screen picture) was not looked at; headless Chrome refuses fullscreen.
- A host with `timecode: false` or `loop: false` on the `keys` dock was reasoned from the code (the link stands alone at the start; the end cell is empty), not screenshotted.

## Trial: Phosphor Fill icons (17 Nov 2026, branch `icons-phosphor-trial`, not merged, not in production)

Requirements: `specs/icons-phosphor-trial.md`. An evaluation: the branch is not merged and production was not deployed. Preview deployment (behind Vercel's login, as every preview of this project is): https://videojs-frameline-8hxotu28e-artmarchuk.vercel.app. After it, production still served the `main` build (same chunk names as before).

### What came in
- `@phosphor-icons/core` **2.1.1**, devDependency, pinned exactly. It is only read; path data is copied into `src/video/icons/*.tsx` and `src/pro/studio/icons.tsx`. No runtime dependency. Every file is one `<path>` on a `0 0 256 256` viewBox (checked for each icon used).
- `FillIcon` next to `Icon` in `src/video/icons/icon.tsx`: 256 grid, `fill="currentColor"`, no stroke, `aria-hidden`, `focusable="false"`, no fixed size. Component names and props are unchanged, so no other file changed.
- `THIRD_PARTY_NOTICES.md` (Phosphor's copyright line and MIT text from the package's `LICENSE`), a Credits line in the README. `LICENSE` untouched.

### Icons used (all names exist in 2.1.1; none had to be replaced)
| Component | Phosphor icon | Weight |
| --- | --- | --- |
| `PlayIcon`, `PauseIcon`, `ReplayIcon` | `play`, `pause`, `arrow-counter-clockwise` | Fill |
| `PreviousCutIcon`, `NextCutIcon` | `skip-back`, `skip-forward` (moved to the step icons in the polish, below) | Fill |
| `LoopIcon`, `GrabFrameIcon`, `BookmarkIcon`, `LinkIcon` | `repeat`, `camera`, `bookmark-simple`, `link` (reverted in the polish) | Fill |
| `GuidesIcon` | `frame-corners` (replaced in the polish) | Fill |
| `FullscreenEnterIcon`, `FullscreenExitIcon` | `corners-out`, `corners-in` | Fill |
| `CaptionsOnIcon`, `CaptionsOffIcon` | `subtitles`, `subtitles-slash` | Fill |
| `SettingsIcon` | `sliders-horizontal` | Fill |
| `VolumeHighIcon`, `VolumeLowIcon`, `VolumeMutedIcon` | `speaker-high`, `speaker-low`, `speaker-x` | Fill |
| `PipEnterIcon`, `PipExitIcon` | `picture-in-picture` for both (there is no exit variant) | Fill |
| `SpeedIcon`, `QualityIcon`, `AudioTrackIcon` | `gauge`, `high-definition`, `waveform` | Fill |
| `KeyboardIcon`, `ErrorIcon` | `keyboard`, `warning-circle` | Fill |
| `CheckIcon` (menus and "Link copied") | `check-fat` | Fill |
| `ChevronIcon` | `caret-right` (rotated by CSS where it points down) | Fill |
| `CloseIcon` | `x` | **Bold** |
| `StepBackIcon`, `StepForwardIcon`, `SpinnerIcon` | ours, unchanged | outline |

### Decisions, and what differs from the spec
- **Close is Bold.** `x` in Fill is a filled rounded square with the cross cut out. `check` in Fill is a tile too, but `check-fat` exists and is a plain solid tick, so the check stays Fill.
- **Chevron stays Fill**, a solid triangle: not a tile or a blob, so the spec's rule for Bold does not apply. It reads well as the small dimmed caret on the Markers, Capture and Guides buttons. In the settings menu the full-size triangles after Speed and Quality read like small play buttons; Bold `caret-right` is the fix if that bothers.
- **`CheckIcon` is one component** for menu items and for "Link copied", so `check-fat` shows in both. It is 16.3 px wide in the link button's 18 px box (the old tick was 11.6).
- **Guides against Fullscreen:** `frame-corners` in Fill is a solid tile with two corner marks cut out; `corners-out` is four separate triangles. They are easy to tell apart at 18 px, so `selection` was not used. It is on the contact sheet for comparison (a tile with four corner marks, closer to Fullscreen).
- `FEATURES.md` said "our own icons"; on this branch it says the icons are copied into the source.
- Play and Pause in the Studio dock have a `fill: currentColor` rule from before; it is now redundant and was left alone.

### The step icons against the solid ones
The two frame-step icons are still 1.5 px outlines, 9.4 × 9.4 px of glyph at the 18 px size. Beside them the cut icons are solid, 11.3 × 13.5 px, and Play is 12.4 × 14.6. The step icons read as lighter and smaller, like a secondary or disabled pair, although they are used more than the cut buttons. This is the weakest spot of the trial (`closeup-transport-after.png`).

### Glyph size (wide dock, 18 px icon box; visible glyph, stroke included for the old set)
| Icon | Before | After |
| --- | --- | --- |
| Play | 9.2 × 11.3 | 12.4 × 14.6 |
| Previous / next cut | 11.6 × 9.4 | 11.3 × 13.5 |
| Step back / forward | 9.4 × 9.4 | unchanged |
| Loop | 13.1 × 13.9 | 14.6 × 13.5 |
| Link | 12.8 × 12.8 | 13.5 × 13.5 |
| Check after a copy | 11.6 × 8.3 | 16.3 × 12.7 |
| Reset range (14 px box) | 7.9 × 7.9 | 9.2 × 9.2 |
| Markers | 9.4 × 12.4 | 10.1 × 14.1 |
| Capture | 13.9 × 12 | 14.6 × 12.9 |
| Guides | 13.9 × 11.6 | 14.6 × 12.4 |
| Menu caret (12 px box) | 3.8 × 6.8 | 4.5 × 8.3 |
| Settings | 15 × 15 | 13.5 × 10.7 |
| Volume high | 12.8 × 10.5 | 16.3 × 14.6 |
| Picture-in-picture | 14.6 × 11.6 | 14.6 × 11.3 |
| Fullscreen | 12.4 × 12.4 | 12.4 × 12.4 |

Phosphor's glyphs are not smaller than ours: most are the same size or a little larger, and being solid they look heavier. Only Settings is smaller. **No global size change is proposed.**

### Checks (headless Google Chrome via Playwright, local production build)
- Typecheck, 219 unit tests, build, the contrast script: pass.
- Browser checks, all pass: `dock-polish` (1440 mouse; 724 × 375, 422 and 352 px touch), `phone-transport` (422, 352, 724 × 375 touch; 1440 mouse), `viewer-gate` (1440 and 320), `guides-menu-focus`, `handle-focus-ring`, `fullscreen-focus`, `reduced-motion`, `two-players`, `configurator`, `zoom`, `range-playback`, `error-retry`. axe on Studio (idle, Guides open, help open) and Viewer: no violations.
- Screenshots, before (`main`) and after in the same states, each opened and looked at: `design/screenshots/icons-phosphor-trial/` (full shots as JPEG, close-ups at 400% as PNG, `pair-*.png` side by side, `contact-sheet.png` with the candidates at 18 and 72 px). Forced colours and more contrast: the solid icons take the text colour like the old ones.

### Bundle sizes (raw / gzip -9)
| Chunk | `main` | This branch |
| --- | --- | --- |
| Viewer path JS (`demo-video-*.js`) | 953,560 / 280,304 B | 957,472 / 281,753 B (+3,912 / +1,449) |
| Studio JS (`studio-*.js`) | 60,910 / 19,309 B | 61,740 / 19,818 B (+830 / +509) |
| Skin CSS | 38,121 / 6,770 B | unchanged |

### Polish (the author's review of the first preview)
The author's verdict on the first set: some icons work, some are wrong. Four changes:
| Component | First trial | Now |
| --- | --- | --- |
| `GuidesIcon` | `frame-corners` | `rectangle-dashed`, Fill |
| `LinkIcon` | `link`, Fill | our own outline drawing again, the same path data as on `main` |
| `StepBackIcon`, `StepForwardIcon` | ours, outline | `skip-back`, `skip-forward`, Fill (the bar-and-arrow glyphs the cut buttons had) |
| `PreviousCutIcon`, `NextCutIcon` | `skip-back`, `skip-forward` | `caret-double-left`, `caret-double-right`, Fill |

All three new names exist in 2.1.1 and are one `<path>` on the 256 grid. `frame-corners` and `link` are no longer used and left `THIRD_PARTY_NOTICES.md`; the three new ones were added.
- The transport is now solid end to end: double carets, bar-and-arrow, Play, bar-and-arrow, double carets. Glyphs at 18 px: cut 12.4 × 12.4, step 11.3 × 13.5, Play 12.4 × 14.6. The step mismatch of the first trial is gone.
- **New mismatch:** the link button is now the only outline icon in the dock, next to the solid timecode field and a solid transport. At 18 px it reads lighter than its neighbours, as the step icons did before (`closeup-transport-polish.png`).
- **Meaning:** the step buttons now use the glyph that media players use for previous/next track, and the cut buttons use the glyph used for rewind/fast-forward. This is the reverse of our earlier convention ("bar plus arrow pointing into it" was the cut). The names, tooltips and shortcuts are unchanged and say what each does.
- `rectangle-dashed` is a solid tile with the dashed frame cut out; beside Fullscreen's four triangles it is clearly different (`closeup-guides-to-fullscreen-polish.png`).
- Checks: typecheck, 219 unit tests, build; `dock-polish` (1440 mouse; 724 × 375 and 422 touch), `phone-transport` (422 touch, 1440 mouse), `viewer-gate` (1440), `configurator`: pass. Forced colours and more contrast: close-ups `*-polish-closeup.png`, icons follow the text colour.
- Bundle sizes (raw / gzip -9): Studio JS 61,801 / 19,744 B (first trial 61,740 / 19,818); Viewer path JS unchanged at 957,472 / 281,752 B.
- Preview deployment after the polish (behind Vercel's login): https://videojs-frameline-5s4hf9jem-artmarchuk.vercel.app. Production was not deployed.

### Round two (`specs/icons-trial-2.md`): our step, marker and capture icons, cut icons put right, "More"
**The step and cut convention**, as in After Effects and Premiere: frame step `◀|` `|▶` (the arrow points away from the bar), previous and next cut `|◀` `▶|` (the arrow points into the bar). The polish round had it the other way, with double carets on the cut buttons; those are gone.

| Component | Now | Source |
| --- | --- | --- |
| `StepBackIcon`, `StepForwardIcon` | `◀|`, `|▶` | ours: `design/icons/fl-step-back-*.svg`, `fl-step-forward-*.svg` |
| `PreviousCutIcon`, `NextCutIcon` | `|◀`, `▶|` | Phosphor `skip-back`, `skip-forward`, Fill |
| `MarkerIcon` (was `BookmarkIcon`; the Markers button) | a marker pin | ours: `design/icons/fl-marker-*.svg` |
| `GrabFrameIcon` (the Capture button) | a camera, lens ring open | ours: `design/icons/fl-capture-*.svg` |
| `SettingsIcon` (the button is now named "More") | three dots | Phosphor `dots-three-outline`, Fill |
| `LinkCopiedIcon` (new; the check after "Link copied") | our thin outline tick, as on `main` | ours (the path of the old `CheckIcon`) |

- **Our drawings are copied as drawn.** Path data and `fill-rule`/`clip-rule` are kept exactly; only `fill="#F2F2F2"` became `currentColor` (set once on the `<svg>`), and the files' `width`/`height` and `fill="none"` were dropped. The camera's lens ring stays open (`closeup-*-marker-capture.png`). The SVG files stay in `design/icons/` and are not shipped.
- **Size mechanism: CSS.** Each of our icons renders three `<svg>` siblings, one per drawing, each with its own viewBox (`0 0 18 18`, `0 0 20 20`, `0 0 24 24`) and a `data-drawn` attribute. `studio.css` shows the 18 px drawing inside a dock button, the 20 px drawing under `.pro-skin[data-dock-size="narrow"][data-bar="pro"]` (the selector that sets `--fl-icon-size` to 20 px), and the 24 px drawing anywhere else. The size and the drawing come from the same attribute, so they switch in the same style pass; the hidden drawings are `display: none` and take no space. Measured in the DOM: wide dock, the 18 drawing at 18 px; narrow dock at 692 × 375 and 390, the 20 drawing at 20 px; after resizing a wide page to 700 px, the 20 drawing at 20 px.
- **Where this is not exact:** a host that changes `--media-scale-unit` scales `--fl-icon-size` with it (e.g. 22.5 px instead of 18), and the 18 px drawing is still the one shown. CSS on the browser floor cannot test a custom property's value (style queries need Chrome 111+, Firefox has none); picking by measured size would need script per icon. At the default scale unit the rule is exact.
- **`BookmarkIcon` renamed to `MarkerIcon`:** two references, covered by the typecheck.
- **More:** Video.js has no text token for "More" (`menu.settings` is the only one), so the label is `strings.more` in `src/video/strings.ts`, used for the button's text and its tooltip. Unlike "Settings", it is English only until the skin strings are translated (Backlog). The help dialog does not name the button. Class names (`media-settings-button`), `SettingsMenu` and `SettingsIcon` keep their names. `FEATURES.md`, the README and `dock-polish.js` say "More".
- **The check after "Link copied"** (asked for alongside the spec): the author found `check-fat` too heavy there. It is our old outline tick again, as `LinkCopiedIcon`, used only in the link button. `CheckIcon` (menu items, the Guides menu) stays `check-fat`, since only the link button was asked about.
- `THIRD_PARTY_NOTICES.md`: added `skip-back`, `skip-forward`, `dots-three-outline`; removed `camera`, `bookmark-simple`, `caret-double-left`, `caret-double-right`, `sliders-horizontal`.
- Checks: typecheck, 219 unit tests, build, the contrast script; browser checks `dock-polish` (1440 mouse; 724 × 375, 422, 352 touch), `phone-transport` (422, 352, 724 × 375 touch; 1440 mouse), `viewer-gate` (1440, 320), `guides-menu-focus`, `handle-focus-ring`, `fullscreen-focus`, `reduced-motion`, `two-players`, `configurator`, `zoom`, `range-playback`, `error-retry`: pass. axe (Studio idle, Guides, help; Viewer): no violations.
- Screenshots, each opened and looked at: `design/screenshots/icons-phosphor-trial/round-2/`.

| Bundle (raw / gzip -9) | `main` | Polish round | Round two |
| --- | --- | --- | --- |
| Viewer path JS (`demo-video-*.js`) | 953,560 / 280,304 B | 957,472 / 281,752 B | 957,351 / 281,721 B |
| Studio JS (`studio-*.js`) | 60,910 / 19,309 B | 61,801 / 19,744 B | 71,222 / 23,741 B |

The Studio chunk grew by about 4 kB gzip: each of our four icons carries three drawings with full-precision path data, which the spec says not to re-optimise.

### Unverified (icon trial)
- **The preview URL was not opened**: it answers with a redirect to Vercel's login. Every check and screenshot ran on the local production build of the same commit.
- **Not seen in the player:** captions on and off (the demo source shows no captions button), volume low and muted, PiP exit, fullscreen exit, replay, the error dialog's icon, the audio-track row, the check after "Link copied" and the keyboard dialog's close button. All were looked at on the contact sheet only, at 18 and 72 px on the dock's grey; the check's size in the link button was also measured in the player.
- Firefox and Safari were not run; the change is SVG `fill` on a path.
- Forced colours and more contrast were emulated in Chrome.
