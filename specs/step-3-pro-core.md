# Step 3 of 9: Pro core (config, state, frame clock)

Read `PROJECT-OVERVIEW.md`, `NOTES.md` and this file before you start. Estimated time: 45 minutes.

## Why this step matters

Steps 4 to 7 are all pro features, and they all need the same three things: a way to say which features are on, a place to keep pro state, and a reliable idea of "the current frame". This step builds those and nothing visible beyond a debug readout. Getting this layer right is what keeps the later steps fast and the Share tier light.

**North star reminder:** Video.js PRO is a skin for video creators. Every pro feature exists to help someone make, check, review or deliver a video, so the data this layer exposes (frame, range, markers) is what a host editor or review tool needs to build on. Design the events and props as if a video-tool developer will read them.

## Out of scope

No user-visible Review or Studio controls: no timecode display, frame-step buttons, in/out UI, timeline changes, guides, View menu, channels or zoom. The only visible additions are the debug readout and the dev-only tier switch described below. Do not touch the Share tier's look or behaviour.

## Before writing code

1. Check the installed `@videojs/react` docs and types for: how `createPlayer({ features })` builds the store, `usePlayer` (selectors, what state it exposes: current time, duration, paused, media element access), whether a **custom feature or store extension API exists**, and how to get a ref to the underlying `<video>` element. **Confirm exact names from the installed package.**
2. Decide where pro state lives:
   - If v10 offers a documented way to extend the store, you may use it.
   - Otherwise (the expected case) keep a **small separate store next to the player**, with a React context and `useSyncExternalStore`, reading v10 state through `usePlayer`. Do not patch or monkey-patch Video.js internals.
3. Record the decision and the reasons in `NOTES.md` under "Decisions", and list verified names under "Verified APIs".

## Requirements

### 3.1 `ProSkin` component and props

Create `ProSkin` as the public entry point. It wraps the existing Share skin and decides what to render. Proposed props (adjust types to what you verify, and note changes):

```tsx
type Tier = 'share' | 'review' | 'studio';

type ProSkinProps = {
  tier?: Tier;                       // default 'share'
  features?: Partial<FeatureFlags>;  // overrides on top of the tier defaults
  fps?: number;                      // frames per second of the source; default 24
  startTimecode?: string;            // e.g. '00:00:00:00'; offset for the displayed timecode
  dropFrame?: boolean;               // only meaningful for 29.97 and 59.94
  markers?: Marker[];                // { time: number; label: string; end?: number; id?: string }
  density?: 'comfortable' | 'compact';
  debug?: boolean;
  slots?: { toolbarStart?: ReactNode; toolbarEnd?: ReactNode; overlay?: ReactNode };
  onInOutChange?: (range: { in: number | null; out: number | null }) => void;
  onMarkerSelect?: (marker: Marker) => void;
  onFrameChange?: (frame: { frame: number; time: number }) => void;
  children: ReactNode;               // the media element, as in the Share skin
};
```

- `fps` is how the skin knows frame timing, because the video element does not expose it. Default 24; the demo video is 24 fps constant.
- Types are exported. Props are documented with TSDoc.
- Unknown feature names or an invalid `fps` (zero, negative, not finite) log **one** clear dev-mode warning and fall back to the default; they never throw.
- Slots are accepted and rendered in the places that exist (`toolbarStart`, `toolbarEnd`, `overlay`); if the area is not rendered at this tier, the slot is ignored without error.

### 3.2 Feature flags and tier defaults

Define one `FeatureFlags` type and one tier-defaults table, as a **pure function with no React**: `resolveFeatures(tier, overrides) => FeatureFlags`.

Flags (all booleans unless noted):

| Flag | Share | Review | Studio |
| --- | --- | --- | --- |
| `timecode` | off | on | on |
| `frameStep` | off | on | on |
| `inOut` | off | on | on |
| `loop` | off | on | on |
| `markers` | off | on | on |
| `shotNav` (previous / next cut) | off | on | on |
| `grabFrame` | off | on | on |
| `copyTimecodeLink` | off | on | on |
| `guides` (`false` or a list of guide ids) | off | all contest guides | all contest guides |
| `platformZones` | off | on | on |
| `channels` | off | off | on |
| `gainGamma` | off | off | on |
| `zoom` | off | off | on |
| `infoHud` | off | off | on |
| `debug` | off | off | off |

- `guides` accepts a list so a host can restrict which exist (for example `['title-safe', '9:16']`). Valid ids for now: `title-safe`, `action-safe`, `thirds`, `centre`, `9:16`, `4:5`, `1:1`, `2.39`.
- Overrides win over tier defaults. A flag set to `false` removes the feature and its code from rendering.
- The resolved object is frozen and memoised so identical inputs give the same reference.
- Flags for features that don't exist yet (steps 4 to 7) are still defined here; they simply have no component to render.

### 3.3 The pro store

A small store, created per `ProSkin` instance (never a module-level singleton, so two players on one page do not share state).

State:
- `inPoint: number | null`, `outPoint: number | null` (seconds)
- `loopMode: 'off' | 'range' | 'whole'`
- `timeDisplay: 'timecode' | 'seconds'`
- `activeOverlays: Set<string>` (guide ids currently on)
- `inspection: { channel: 'rgb' | 'r' | 'g' | 'b' | 'luma'; gain: number; gamma: number; zoom: 'fit' | '100%' | number }`
- `frame: number`, `mediaTime: number` (from the frame clock)

Rules:
- Actions are plain functions on the store: `setIn`, `setOut`, `clearInOut`, `setLoopMode`, `toggleTimeDisplay`, `toggleOverlay`, `setInspection`, `resetInspection`. Keep them small and pure where possible.
- **Invariants live in the store:** `in` must be before `out` (if a user sets one past the other, swap or reject, and document which); both are clamped to `[0, duration]`; clearing in/out resets `loopMode` from `'range'` to `'off'`.
- Components subscribe with **selectors** so they only re-render when their slice changes. The skin must **not** re-render as a whole on every frame; verify this with React DevTools or a render counter and record the result.
- `onInOutChange` fires when `inPoint` or `outPoint` change (not on every store update). `onMarkerSelect` is a store action that components call. `onFrameChange` is covered in 3.4.
- Persistence of View choices (overlays, display mode) is **step 6**. Design the state so it can be persisted, but do not add `localStorage` yet.

### 3.4 Frame clock

A hook, `useFrameClock(videoEl, fps)`, that keeps `frame` and `mediaTime` current.

- **Primary source:** `HTMLVideoElement.requestVideoFrameCallback`. Use the `mediaTime` it reports for the presented frame and compute `frame = Math.round(mediaTime * fps)`. Re-register the callback on every call, as the API requires, and cancel it on cleanup.
- **Fallback:** where `requestVideoFrameCallback` is missing, use `requestAnimationFrame` while playing and read `currentTime`; and on `seeked`, `timeupdate`, `pause` and `loadedmetadata`. Mark the clock as `precision: 'approximate'`.
- Always update after a seek or a pause (a single rVFC may not fire for a paused frame in some browsers; test and handle it, for example by re-reading `currentTime` on `seeked` and on `pause`).
- Do not push every frame to React state if nothing is subscribed that needs it. Subscribers (such as the debug readout, later the timecode display and the timeline) read through selectors. `onFrameChange` fires only when the frame **number** changes, and is optional.
- Expose `precision: 'frame' | 'approximate'` and `source: 'rvfc' | 'raf'` so the UI can be honest.
- Frame accuracy is **best effort**: rVFC can report a frame one off in some browsers. Do not claim otherwise in code comments, docs or UI. Record what you observe in `NOTES.md`.
- Clean up on unmount and when the media element changes (a new source, or a swap of the element). No leaked callbacks.

### 3.5 Timecode utilities (with unit tests)

A pure module, no React and no DOM: `timecode.ts`.

Functions (names are suggestions):
- `framesFromSeconds(seconds, fps)` and `secondsFromFrames(frames, fps)`.
- `formatTimecode(frames, fps, { dropFrame, startFrames })` → `HH:MM:SS:FF` (use `;` before the frames for drop-frame, per SMPTE convention).
- `parseTimecode(string, fps, { dropFrame })` → frames, or `null` if invalid.
- Support integer rates (24, 25, 30, 50, 60) and the fractional rates 23.976, 29.97 and 59.94 (which use the nominal integer count, and for 29.97 and 59.94 optionally drop-frame).

Decisions to make and record in `NOTES.md`: how fractional rates are represented in `fps` (for example `30000/1001` or `29.97`), and how a rounding error is avoided.

Add a test runner if the project has none (Vitest is a fine choice), plus a `test` script. Tests must cover at least:
- 24 fps: frame 0 → `00:00:00:00`; frame 23 → `00:00:00:23`; frame 24 → `00:00:01:00`; one hour → `01:00:00:00`.
- 25 and 30 fps equivalents.
- 29.97 **non-drop** and **drop-frame**: the known boundary around the first minute (`00:00:59:29` → `00:01:00:02` in drop-frame, frames 0 and 1 skipped), the 10-minute exception, and a long value such as one hour.
- `startFrames` offset.
- Round trips: `parse(format(n)) === n` for a spread of frame numbers, including many around minute boundaries.
- Bad input to `parseTimecode` returns `null` and never throws; negative frames and non-finite fps are rejected or clamped with a documented rule.
- Frame/seconds conversion at awkward values (for example `time = 1.0416666…` at 24 fps is frame 25).

### 3.6 Data attributes and lazy loading

- `data-tier`, `data-density` and **one `data-*` attribute per active overlay** (for example `data-guide-title-safe`) are set on `Container` from state, replacing the static values from step 2. Hosts can restyle against them.
- Pro features are code-split: each tier's extra components live in a lazily loaded module (`React.lazy` or dynamic `import()`). The Share tier **must not** load or include pro code.
- **Prove it:** run the production build and record in `NOTES.md` the Share-only chunk size and the pro chunk sizes (gzip). If the Share path pulls in pro code, fix it before finishing.
- Lazy modules render nothing and cause no layout shift while loading; there is no visible spinner for them.
- Provide a `Suspense` boundary with a `null` fallback.

### 3.7 Debug readout and dev tier switch

- **Debug readout:** a small mono-type panel in a corner of the player, shown only when `debug` is true or the URL has `?debug`. It lists: tier, density, resolved features (compact), `fps`, `frame`, `mediaTime` (3 decimals), frame-clock `source` and `precision`, in/out, loop mode, and `getVideoPlaybackQuality()` dropped frames if available. It updates through selectors, not by re-rendering the whole skin.
- **Dev tier switch:** a plain row of three buttons (Share, Review, Studio) shown only with `?debug` and placed **outside** the player in the preview page. It is a development tool, not the configurator (step 8). Don't style it.
- Both must be absent from the production UI without `?debug`, and not ship in the Share chunk.

### 3.8 Tests and checks

- Unit tests: timecode (3.5), `resolveFeatures` (tier defaults, overrides, unknown flag, frozen and memoised result), store invariants (in/out ordering, clamping, clearing in/out resets loop mode), and the `guides` list filter.
- Manual check, recorded in `NOTES.md`: the frame number in the debug readout matches the burned-in frame counter or a known test video when stepping with the arrow keys paused (the browser's default arrow behaviour is fine here; stepping UI comes in step 4). Record the browser and result, and any off-by-one you see.
- `npm run build` and `npm test` pass with no warnings you can fix.

### 3.9 Deploy

- Deploy and open the public URL: it must look and behave **exactly like the end of step 2** (Share tier, no pro UI). Then open it with `?debug` and confirm the readout and the dev tier switch work.
- Update `README.md` with `ProSkin` usage, props and the feature-flag table.

## Acceptance criteria

- [ ] Switching `tier` (via the dev switch) changes which flags are on, and `data-tier` follows. No visible pro UI exists yet except the debug readout.
- [ ] The debug readout shows a frame number and `mediaTime` that update during playback and after seeking and pausing.
- [ ] The Share tier loads no pro code; chunk sizes are recorded.
- [ ] The skin does not re-render as a whole on every frame; the check is recorded.
- [ ] Timecode tests (including 29.97 drop-frame boundaries) and store and flag tests pass.
- [ ] The pro store is per instance: two `ProSkin` instances on one page do not interfere (add a test or a manual check).
- [ ] The public URL looks identical to step 2 without `?debug`; no regressions in the step 2 gate checklist (re-run the keyboard-only and phone checks).
- [ ] Git history is clean, one commit per requirement group, with the attribution lines from your session instructions.

## Report back (keep it short)

1. The public URL and whether the step 2 gate still passes.
2. Where pro state lives, and why (did v10 have a custom-feature API?).
3. Frame clock results: which source each browser used, and any off-by-one frames you saw.
4. Chunk sizes: Share versus pro.
5. Differences from the props or flags proposed here, and anything unverified.
6. Anything that will affect step 4 (Review transport).
