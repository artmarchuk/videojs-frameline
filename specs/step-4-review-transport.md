# Step 4 of 9: Review transport

Read `PROJECT-OVERVIEW.md`, `NOTES.md` and this file before you start. Estimated time: 1 hour.

## Why this step matters

This is the first step where the skin does something a stock player does not. Review transport is the core of what a creator needs from a preview monitor: check a cut frame by frame, mark a range, loop it, grab a frame, and send someone a link to a moment. After this step, a judge who switches to the Review tier should immediately feel the difference.

**North star reminder:** Video.js PRO is a skin for video creators. Every control here answers a real task: check a cut, mark a range, choose a frame, tell someone where to look. Build for that task, label things in creators' words, and do not add a control that has no task.

## Out of scope

- No timeline restyling: no tick ruler, no timecode bubble, no in/out range drawn on the track, no marker drawing. That is step 5. In this step the in/out range lives only in the store and in the controls (a text readout of the range is fine).
- No guides, View menu, platform zones, channels, gain/gamma, zoom, info HUD (steps 6 and 7).
- No shuttle (`J`/`K`/`L` stay as the YouTube map), no ping-pong, no reverse playback.
- No change to the Share tier.

## Before writing code

1. Re-read `NOTES.md` for how step 3 exposed the store, the frame clock and `resolveFeatures`. Build on them; do not duplicate them.
2. Confirm from the installed package how to add custom hotkeys (`Hotkey` and the documented custom-action route), tooltips on custom buttons, and how the control bar accepts extra groups. **Use verified names only.**
3. Check how `Container` hosts the `<video>` element and how to reach it for a canvas capture.

## Requirements

### 4.1 Control bar layout for Review

At `tier="review"` (and `studio`), the control bar gains groups. Share keeps its existing bar.

| Group | Controls |
| --- | --- |
| Transport | Previous cut, step back one frame, play/pause, step forward one frame, next cut |
| Time | Timecode display (mono, tabular) with a seconds/frames toggle, and the total duration |
| Range | Set In, Set Out, Loop toggle, a compact readout of the range (`In 00:00:04:12 → Out 00:00:09:00`) |
| Actions | Grab frame, Copy link at timecode, Use frame as poster |

Layout rules:
- Transport and time stay visible at every width. At narrow container widths, the Range and Actions groups collapse into one **"More" menu** (a `Menu` in a `Popover`) that is fully keyboard operable.
- Targets: at least 24×24 px, 44×44 on touch, as in step 2. Do not shrink Share's existing controls to make room.
- Use the custom icon family from step 2. Add the new icons in the same style: frame step back/forward, previous/next cut, mark in, mark out, loop range, grab frame, copy link, set poster.
- Each control is shown only when its feature flag is on (`frameStep`, `shotNav`, `timecode`, `inOut`, `loop`, `grabFrame`, `copyTimecodeLink`, and the new `posterFrame`, see 4.7).
- All of this code lives in the lazily loaded Review module. The Share chunk must not grow; record the sizes again.

### 4.2 Timecode display

- Show `HH:MM:SS:FF` from the frame clock, using the step 3 utilities, with `startTimecode` and `dropFrame` respected. Show the duration next to it (`00:00:42:12 / 00:03:20:00`).
- **Click or press** the timecode to toggle between timecode and seconds (`42.500`). The toggle is a button with `aria-pressed`, the tooltip says what it will switch to, and the choice is stored in `timeDisplay`.
- While playing, update through a selector on the frame number only. Digits must not shift width (tabular numerals).
- Screen readers: do not announce every frame. The timecode element is not a live region; announce it only on request (focus) or on a seek or step.
- If `precision` is `'approximate'`, show a small "≈" before the value and say why in the tooltip. Do not hide the limitation.

### 4.3 Frame stepping

- **Buttons and keys:** step back `,` and `←` while paused; step forward `.` and `→` while paused. `Shift+←` and `Shift+→` jump ±10 frames. The Share map's `←` / `→` (seek 5 s) still applies while **playing**; while **paused**, in the Review tier, they step one frame. Show this in the shortcut help.
- Stepping while playing: pause first, then step.
- **Seek target:** to land cleanly on a frame, seek to the frame's time plus half a frame (`(frame + 0.5) / fps`), not the exact boundary, and let the frame clock report the result. Test it, record whether the displayed frame matches the target, and change the offset if a browser shows an off-by-one. Report what you observed per browser.
- Clamp to `[0, last frame]`. At the ends, stepping does nothing and announces "Start" or "End".
- Holding a key repeats at the browser's key-repeat rate; make sure stepping stays responsive (cancel or skip a seek that has not finished rather than queueing a backlog).
- Compute targets with a pure, tested function (see 4.9).

### 4.4 In and out points, and looping

- **Set In** (`I`) and **Set Out** (`O`) mark the **current frame**, stored as seconds (`frame / fps`). Press again at another frame to move it. **Clear** (`Shift+I` clears In, `Shift+O` clears Out, and a "Clear range" item in the More menu clears both).
- The store's invariants apply (In before Out; clamping). If the user sets a point that would invert the range, apply the rule decided in step 3 and **announce what happened** ("In point moved after Out point, so the range was reset").
- Only In set: the range runs from In to the end. Only Out set: from the start to Out.
- **Loop toggle** (button, and `R`): cycles `off → range → off` (and `whole` is not exposed in the UI yet). Loop requires a range; if none exists, the control is disabled with an explanatory tooltip.
- **Looping behaviour:** with loop on, when playback reaches Out (use the frame clock, trigger when `mediaTime >= out - 0.5/fps`), seek to In and keep playing. With loop off and a range set, a **"Play range"** action (an item in More, and a button next to Loop on wide widths) seeks to In, plays, and **pauses at Out**.
- If playback starts outside the range while loop is on, jump to In first. Record this rule in `NOTES.md`.
- Expect a one-frame overshoot at the loop point; do not claim exact loops. Record what you observe.
- Call `onInOutChange({ in, out })` whenever either point changes.
- Range readout: mono text in the Range group, `aria-live="off"`; changes are announced separately (4.6).

### 4.5 Previous and next cut

- **Cut list:** the sorted, de-duplicated times of **chapter starts** if the media has chapters; otherwise the times of the `markers` prop. Document this rule.
- **Previous cut** goes to the nearest cut strictly before the playhead minus half a frame (so pressing it twice quickly moves two cuts, not one); **next cut** goes to the nearest cut after the playhead. If there is none, announce "No previous cut" or "No next cut" and stay.
- Keys: `[` and `]`. The buttons are disabled with a tooltip when there are no cuts.
- Land on the cut using the same seek-target rule as stepping.
- Fire `onMarkerSelect(marker)` only if the target came from a `marker`. Chapters have no marker object.
- The cut-finding logic is a pure, tested function.

### 4.6 Tooltips, names and announcements

- Every new control has an **accessible name** and a **tooltip that shows its shortcut** (for example "Step forward one frame (.)"). Tooltips appear on hover and on keyboard focus and are dismissible with `Esc`.
- Announce changes through the Video.js `StatusAnnouncer` or one polite live region of your own (use one, not both): "In point set at 00:00:04:12", "Out point cleared", "Loop on", "Frame 100, 00:00:04:04" for steps (throttled so held keys don't flood; announce the final frame after a pause in the repeat), "Grabbed frame", "Link copied".
- Toggle buttons use `aria-pressed`. Disabled buttons use `aria-disabled` and keep a tooltip that says why.
- Update the **`Shift+?` help dialog** to list the shortcuts active in the current tier. It must still show only what is live.

### 4.7 Grab frame, copy link, use as poster

**Grab frame**
- Draw the **current video frame** to a canvas at the video's intrinsic size (`videoWidth × videoHeight`), then offer it as a **PNG download**, and also **copy it to the clipboard** where `ClipboardItem` with `image/png` is supported. Use a single button with a small menu ("Download PNG", "Copy image"), or two items in More; choose and record why.
- File name: `<title or "frame">_<timecode with dashes>.png`, for example `frame_00-00-12-05.png`.
- Grab the **raw frame**: without guides, overlays, filters or zoom. Say this in the tooltip.
- Cross-origin: capture needs the media loaded with CORS (`crossorigin="anonymous"` on the video and CORS headers from the host; Mux sends them). If the canvas is tainted and `toBlob` or `toDataURL` throws, **catch it** and show a plain message: "This video's host does not allow frame capture." Do not fail silently or throw. Test the error path with a non-CORS source.
- Grab at the **frame the user sees**. If the video is playing, grab the current frame and announce it; do not pause.

**Copy link at timecode**
- Build a URL for the current page with the position in the hash (for example `#t=00:00:12:05`, or seconds if `timeDisplay` is `'seconds'`; pick one format and document it), copy it to the clipboard with a fallback for browsers that need a user-gesture workaround, announce "Link copied", and fire `onCopyLink?: ({ url, frame, time })`.
- On load, if the hash holds a valid position, seek there (paused) once metadata is ready. Parse with the step 3 utility; ignore invalid values without error. Do not remove existing hash content that belongs to the host app.

**Use frame as poster**
- Add the feature flag `posterFrame` (Review and Studio on, Share off) to `resolveFeatures` and its tests.
- The action fires `onPosterFrame?: ({ frame, time, timecode })` with the **current frame**; the host app stores it. The skin does not upload or save anything.
- Add the prop to the props type and to the README.

### 4.8 Hotkey rules

Keys added in this step, in addition to the Share map: `I`, `O`, `,`, `.`, `Shift+←`, `Shift+→`, `←` and `→` while paused (Review and Studio only), and the extra keys proposed here: `Shift+I`, `Shift+O`, `R`, `[`, `]`, `G` (grab frame).

- None of these may change the meaning of a Share-map key while the player is **playing**.
- Keys are only active when the player or one of its controls has focus, never when focus is in a text field, and never when a modifier (Ctrl, Cmd, Alt) is held, so browser shortcuts keep working.
- If any proposed key turns out to conflict with a Video.js v10 default or an assistive-technology convention, **choose another and tell the author** in the report.
- Register the hotkeys only when the feature that owns them is on.

### 4.9 Tests and checks

Unit tests (pure functions, no DOM):
- Step target: forward and back at 24 fps, clamped at the start and the end, ±10 frames, the half-frame offset.
- Cut navigation: previous/next from a sorted list, ties and duplicates, before the first cut, after the last, "press twice quickly" behaviour near a cut.
- Range logic: In only, Out only, both, inversion rule, clearing, clamping to the duration.
- Loop decision: given `mediaTime`, range, fps, mode → `continue` or `jumpToIn` or `pauseAtOut`.
- Link format and parse: round trips, invalid values, seconds format, hash that already holds host data.
- `resolveFeatures` with the new `posterFrame` flag.

Manual checks, recorded in `NOTES.md` with browser and result:
- Mark a range and loop it **by mouse alone**, and then **by keyboard alone**.
- Step forward 30 frames and back 30 frames; the frame number returns to its start.
- Grab a frame from a CORS-enabled source and from a non-CORS source (the error path).
- Copy a link, open it in a new tab, and confirm it lands on the same frame.
- Narrow container (320 px): transport and time are visible, the More menu opens and works with the keyboard, nothing overflows.
- Focus ring, tooltips and the help dialog work for every new control.
- The Share tier is unchanged: re-run the step 2 keyboard-only and phone checks.

### 4.10 Deploy

Deploy and test on the **public URL** with `?debug` and the dev tier switch from step 3. Update `README.md` with the new props, events and shortcuts.

## Acceptance criteria

- [ ] A range can be marked and looped by mouse and by keyboard alone.
- [ ] Frame stepping works forward and back, with `,` `.` `Shift+←/→`, and the displayed frame number is consistent with the debug readout; any off-by-one is documented.
- [ ] Previous/next cut works from chapters, or from markers if there are none.
- [ ] Grab frame downloads a PNG and copies an image where supported, with a clear message when the host blocks capture.
- [ ] Copy link produces a URL that reopens on the same frame.
- [ ] `onInOutChange`, `onMarkerSelect`, `onCopyLink` and `onPosterFrame` fire as specified.
- [ ] Every new control has a name, a tooltip with its shortcut, and announcements; the help dialog lists the active map.
- [ ] No pro code in the Share chunk; sizes recorded.
- [ ] The Share tier and the step 2 gate are unchanged.
- [ ] Tests pass; build passes; the public URL works; git history is clean with the attribution lines from your session instructions.

## Report back (keep it short)

1. The public URL and whether the step 2 gate still passes.
2. Per browser: how accurate stepping and loop points were, and the seek offset you ended with.
3. Where you chose differently from this brief (layout, grab menu, link format, extra keys), and why.
4. Any shortcut that conflicted and what you chose instead.
5. Chunk sizes: Share versus Review.
6. Anything unverified, and anything that will affect step 5 (the ruler timeline needs to draw In, Out, markers and the playhead from the store).
