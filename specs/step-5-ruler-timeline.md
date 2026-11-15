# Step 5 of 9: Ruler timeline

Read `PROJECT-OVERVIEW.md`, `NOTES.md` and this file before you start. Estimated time: 1.5 hours.

## Why this step matters

This is the signature visual of the entry, and 10 of the 25 points are for visual design and originality. The ruler timeline is the first thing a judge sees when they switch to Review. It must look like it belongs in a professional editor, and it must still be a plain, accessible slider underneath.

**North star reminder:** Video.js PRO is a skin for video creators. The timeline is where a creator reads time, sees their range and finds their cuts. Design it as a working surface for those tasks, not as decoration. A tick, a label or a colour that does not help read time or position should not be there.

## Moodboard

The author's reference is a screenshot of a professional video-editor UI: dark graphite panels, a ruler with fine ticks and timecode labels, a bright accent playhead with a timecode bubble, an in/out range highlight. **If `design/moodboard.png` exists in the repository, open it and study it before designing.** If it does not, ask the author to add it and say so in your report. Do not copy another product's pixels or layout one-to-one; take the principles (ruler density, the bubble on the playhead, the range highlight) and make them ours with the step 2 tokens.

## Out of scope

- No timeline zoom or horizontal scroll of the timeline. The ruler always spans the full duration.
- No audio waveform, no thumbnails strip under the ruler, no drawing annotations, no creating markers or range comments by the user (markers come from the `markers` prop).
- No guides, View menu or Studio features (steps 6 and 7).
- No change to the Share tier. It keeps the stock `TimeSlider` styling from step 2.

## Before writing code

1. From the installed package, confirm exact names and behaviour of `TimeSlider` and its parts: `Root`, `Track`, `Buffer`, `Fill`, `Thumb`, `Preview`, `Chapters`, `Markers` (and any marker component), their `data-*` state attributes and the CSS variables (`--media-slider-fill`, `--media-slider-pointer`, `--media-slider-buffer`). Record them under "Verified APIs".
2. Check how keyboard and pointer input is handled by the stock slider (arrow step sizes, `Home`/`End`, `PageUp`/`PageDown`, dragging, touch). **The Review timeline must keep all of this.**
3. Check whether the media provides a storyboard (thumbnail) track and chapters, so the preview and chapter segments can use them.
4. Reread how step 4 reads and writes In, Out, loop mode and markers, and reuse those store actions.
5. **Check that you can see.** In step 4 the driven Chrome window was hidden, so nothing visual was ever checked. Before designing, test that you can take a real screenshot at a set viewport. If you cannot, use headless Chromium (for example Playwright with its bundled Chromium; install it if the network allows) to render the preview page at 360, 768 and 1280 px wide, open the screenshots with Read and look at them. Say in your report which method you used. **Do not call the visual work done without having looked at the rendered result.** Also look at the step 4 Review bar once, and tell the author what looks wrong in it, as nobody has seen it yet.

## Requirements

### 5.1 Structure and where it lives

- A new lazily loaded module `src/pro/review/timeline/` that replaces the Share seek bar **only** in the Review and Studio tiers.
- It is still built on the Video.js `TimeSlider` (the same root, track, buffer, fill and thumb) so slider semantics, pointer capture, keyboard handling and media state stay Video.js's job. We add the ruler, the bubble, the range and the markers around and over it.
- Layout: the timeline is a **full-width row above the control buttons**, in this vertical order: marker lane, ruler (ticks and labels), track with fill and playhead. Total height about 56 px in `comfortable` density and about 44 px in `compact`; targets and hit areas still meet the minimums below.
- The timeline is always `dir="ltr"` even when the page is RTL: time runs left to right, as in editors. The labels and bubble stay left-to-right too.
- The Share chunk may grow only by hooks that must live in the Share skin (a few hundred bytes; no more than about 1 kB raw in total) and **no Review logic may enter it**; record the chunk sizes again.
- **Bar height:** in Review the seek bar already has its own row and the button row wraps. With the timeline added, keep the whole bar from covering too much of the video: measure the total height of the Review bar at 1280 px and 360 px wide, report both, and tighten spacing if it exceeds about 30% of the video height at 360 px.

### 5.2 The tick ruler

- Draw major and minor ticks along the top of the track, scaled to the **duration, the container width and `fps`**.
- Choose the tick interval with a pure function from a list of "nice" steps (for example 1 frame, 2, 5, 10 frames, 1 s, 2 s, 5 s, 10 s, 30 s, 1 min, 5 min, 10 min and so on) so that:
  - minor ticks are never closer than about 6 px,
  - labelled major ticks are never closer than about 80 px,
  - frame-level ticks only appear if the width allows (for a 60 s video at 800 px, they will not; that is expected and correct).
- Labels use the timecode format from step 3 (`00:00:10:00`, or shorter `0:10` in `seconds` display mode, matching `timeDisplay`), in the mono tabular font, 10 to 11 px in the scale unit. Labels are clipped inside the track at both ends; the first and last label must not overflow the container.
- **Performance:** do not render hundreds of DOM nodes. Draw ticks with a CSS gradient, an SVG pattern or a `<canvas>`, and render at most the major labels as DOM text. Redraw on resize (use a `ResizeObserver`), and on duration or `fps` change, not on every frame. Make lines crisp on high-DPI screens (1 device pixel lines).
- Ticks and labels are decorative: `aria-hidden="true"`. Tick colour `--pro-line` to `--pro-text-dim`; labels `--pro-text-dim` (at least 4.5:1 against the bar).

### 5.3 Playhead and timecode bubble

- The playhead is a **thin vertical line in `--pro-accent`** from the top of the ruler through the track, with a handle on the track that serves as the slider thumb. Its hit area is at least 24 px wide (44 px on touch) even if the visible line is 1 to 2 px.
- A **timecode bubble** rides the playhead above the ruler, in the accent colour with `--pro-accent-ink` text, mono tabular numerals, showing the current position in the current display mode. It is visible whenever the Review or Studio timeline is shown (not just on hover). Do not let it overflow: clamp its centre so the whole bubble stays inside the container at both ends.
- While **dragging** or **hovering**, a second, quieter bubble (outline, not filled) shows the position under the pointer, so a creator can see where a click will land without moving the playhead. If a storyboard exists, show the thumbnail in `Preview` above it. Thumbnails are near-frame, not every frame; do not claim otherwise.
- **Frame snapping:** in Review and Studio, seeking by pointer or by slider keys snaps the target to a frame boundary plus the half-frame offset used in step 4, using the same pure function. The bubble shows the snapped position. Record what this does for scrubbing feel; if it makes scrubbing stutter at high speed, snap only on release and say so.
- Under `prefers-reduced-motion`, nothing animates; the bubble and playhead jump to position.

### 5.4 Buffered range and chapters

- Buffered range: a subtle band (`--pro-line` to `--pro-text-dim` at low opacity) under the ruler, from the Video.js `Buffer` part.
- Chapters: if the media has chapters, show **thin gaps** in the track at chapter boundaries (Video.js `Chapters` part) and the chapter title in the hover bubble. Chapter starts are also the cut list for previous/next cut (step 4); keep that behaviour unchanged.

### 5.5 In and out range

- When In and/or Out are set in the store, draw a **range highlight** along the track: a translucent accent fill between them, with a small bracket handle at each end (`[` at In, `]` at Out), in accent. If only one point is set, draw the open side to the track end with a fading edge so it is clear the range is open.
- **Draggable handles (pointer):** drag In and Out to move them; they snap to frame boundaries; the store's invariants (order, clamping, swap or reject rule from step 3) apply; `onInOutChange` fires on release, not on every move. While dragging, show the handle's timecode in a bubble.
- **Keyboard equivalents:** each handle is a **focusable element with `role="slider"`**, an accessible name ("In point" / "Out point"), `aria-valuemin`, `aria-valuemax`, `aria-valuenow` in seconds and `aria-valuetext` in the current timecode format. When a handle has focus: `←` / `→` move it one frame, `Shift+←` / `Shift+→` move it ten frames, `Home` / `End` move it to its limits, `Delete` or `Backspace` clears it. These keys apply to the handle **only while it has focus** and must not trigger the global map (stop propagation for those keys).
- Handles appear in the tab order only when they exist (when the point is set). Their tab order is: seek slider, In handle, Out handle, then the rest of the controls.
- Hit areas are at least 24×24 px (44×44 on touch). On touch, dragging a handle must not scroll the page (`touch-action: none` on the handles and the track only).
- A click on the range highlight itself seeks to that point; it does not start a drag.
- In step 4, the loop shows the Out frame before jumping back to In, so the range is effectively **inclusive of the Out frame**. Keep drawing the highlight to the Out time (one frame is under a pixel at normal widths) and note the rule in `NOTES.md`.
- Announce handle moves through the **Review live region and toast from step 4**; do not add a second live region. Messages like step 4's: "In point moved to 00:00:04:12" (throttled while dragging; announce on release).

### 5.6 Markers

- Markers come from the `markers` prop: `{ time, label, end?, id? }`.
- **Point markers** are small accent or neutral flags in the marker lane at their time; **range markers** (with `end`) are a thin bar across the lane. Use a different shape or fill for each so colour is not the only difference.
- Layout: markers closer than about 12 px share the lane without overlapping (stack in two rows, or collapse into a cluster with a count, whichever stays readable; document the choice). Clamp near the edges so a marker at time 0 or at the duration stays fully visible.
- Hover or focus shows a tooltip with the label and timecode. **Click or Enter** seeks to the marker (using the snapped target) and calls `onMarkerSelect(marker)`.
- **Keyboard access without a tab stop per marker:** markers are reachable through the existing previous/next cut keys (`[` and `]`, which already use markers when there are no chapters) and through a **"Markers" list** in the More menu (a menu item per marker, with label and timecode, activating one seeks to it). Do not add a tab stop per marker. Document this in the help dialog.
- Marker visuals are decorative to the pointer layer and exposed to assistive tech through that menu list, so screen reader users get the same information. Do not use colour as the only difference between marker types.
- **Make the markers visible in the preview.** The demo stream has chapters but no markers, and the events have never fired in a browser. Make the preview page pass sample markers (a point marker, a range marker, one at time 0, one at the duration, and a cluster of three within a second) and handlers for `onInOutChange`, `onMarkerSelect`, `onCopyLink`, `onPosterFrame` and `onFrameChange` that append to a small on-page event log (visible with `?debug`). The author will use this to check the events.
- At most about 200 markers are expected; if more are passed, render without crashing and log a dev warning.

### 5.7 Slider behaviour must remain stock

The timeline is "a slider that looks like a ruler", and must behave like one:

- The seek slider has an accessible name, `role="slider"` semantics from Video.js, and `aria-valuetext` expressed as **timecode** (not just seconds) in Review and Studio.
- Mouse and touch drag, click-to-seek, hover preview, `Home` / `End`, arrow keys, `PageUp` / `PageDown` still work. The arrow keys on the focused slider should match the global rule from step 4 (one frame while paused in Review, 5 s while playing). If the stock slider handles keys differently, reconcile them so there is **one** behaviour, and record the choice.
- Pointer capture works when the pointer leaves the track while dragging. No stuck drag on `pointercancel`.
- The focus ring is visible on the slider and on each handle, 2px accent with an offset, at least 3:1 against its neighbours.
- No layout shift when the bubble or tooltips appear.

### 5.8 Responsive behaviour and density

- Works from 320 px to full width. At narrow widths: fewer labels (the label interval widens automatically), the marker lane stays but markers cluster, the bubble stays clamped.
- `compact` density reduces the row height but never the hit areas below 24 px; touch forces `comfortable` and 44 px.
- Fullscreen: the timeline stays inside the container and scales with it.

### 5.9 Tests and checks

Unit tests (pure functions):
- Tick interval chooser: various durations (10 s, 60 s, 10 min, 3 h), widths (320, 800, 1920) and fps; assert the minimum spacing rules and that labels never fall closer than 80 px.
- Time ↔ pixel conversion, round trips, clamping at the ends.
- Frame snapping: the snapped target equals the step 4 rule at several positions.
- Marker layout: overlapping markers, markers at 0 and at the duration, range markers, the 200-marker case.
- Handle drag maths: drag past the other handle (swap or reject), clamp to `[0, duration]`, release rounds to a frame.
- Bubble clamping at both edges.

Manual checks, recorded in `NOTES.md` with browser and result:
- **Compare against the moodboard** side by side and list what matches and what differs on purpose.
- Keyboard only: reach the seek slider and both handles, move them by frame, clear them, and check the announcements.
- Mouse: drag the playhead, drag In and Out, click a marker, scrub over a bright and then a dark frame, and confirm the bubble and ticks stay readable.
- Touch (device or emulation, and say which): drag the playhead and a handle without the page scrolling.
- Narrow container at 320 px and a long video (a one-hour duration prop) to check label density.
- The Share tier looks and behaves exactly as at the end of step 2: re-run the step 2 keyboard-only and phone checks.
- Reduced motion: no animation (OS setting, if the browser can be driven; otherwise say not tested).
- Screenshot the Review tier at 1280 px, 768 px and 360 px width, **look at each one**, fix what you see, and save the final ones to `design/screenshots/step-5/`. Include one with markers and a range set, one with the cluster, and one at the one-hour duration.

### 5.10 Deploy

Deploy and test on the **public URL** with `?debug` and the dev tier switch. Update `README.md` with the marker format and any new props.

## Acceptance criteria

- [ ] The Review tier shows a tick ruler, a playhead with a timecode bubble, a buffered range, the In/Out range highlight and markers, and the author agrees it matches the moodboard's intent.
- [ ] It is still an accessible slider: keyboard, mouse, touch, `aria-valuetext` in timecode, visible focus.
- [ ] In and Out handles can be dragged and moved by keyboard; announcements work; `onInOutChange` fires on release.
- [ ] Markers can be clicked and reached by keyboard (via `[` `]` and the Markers list); `onMarkerSelect` fires.
- [ ] Ticks and labels stay readable and uncluttered for a 10 s, a 60 s and a one-hour duration at 320 px and 1920 px.
- [ ] The Share chunk did not grow; sizes recorded. The Share tier and step 2 gate are unchanged.
- [ ] Tests pass; build passes; the public URL works; git history is clean with the attribution lines from your session instructions.

## Report back (keep it short)

1. The public URL, the screenshots you saved, and **how you took them** (real browser or headless).
2. What matches the moodboard, and what differs on purpose.
3. How you reconciled slider keys with the step 4 map, and whether pointer snapping stays smooth.
4. Tick and marker layout choices (rendering method, clustering).
5. Per browser: anything that rendered differently (Chrome, plus Firefox and Safari if you could test).
6. Chunk sizes: Share versus Review.
7. Differences from this brief, anything unverified, and anything that will affect step 6 (the overlay layer and View menu).
