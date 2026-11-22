# Step 6 of 9: Viewer and Studio rework, then View menu and guides

Read `PROJECT-OVERVIEW.md`, `NOTES.md` and this file before you start. Estimated time: 2.5 hours, in two parts with a checkpoint between them.

**This file replaces the old `step-6-view-menu-and-guides.md`, and overrides steps 2, 4, 5 and 5b wherever they conflict**: the tier names, the dock's rows, the timeline, the range controls and the markers all change here.

## Why this step exists

The author reviewed the step 5b build and the mockups and decided:

1. **Two tiers, not three.** Review and Studio looked identical, which confused everyone. They merge into **Studio**. Share is renamed **Viewer**.
2. **A calmer, clearer toolbar.** The "Range, Capture, View" tray looked like a dropdown but was not one. It is replaced by real menus, and the controls are arranged like a professional editor's monitor: timecode on the left, transport in the centre, tools and playback on the right.
3. **A compact timeline.** The tall time bubble and the separate marker lane wasted space. The picture should be as large as possible.
4. **The range lives on the timeline.** In and Out are draggable handles on the timeline, as in After Effects' work-area bar, with keyboard equivalents. They are no longer buttons in the desktop toolbar.
5. **Markers are simpler.** One visual, one concept.

After that rework (Part A), this step adds the View menu and the guides (Part B).

**North star reminder:** Video.js PRO is a skin for video creators. The picture is what the creator looks at, so it gets the room, and the controls stay quiet, honest and organised by task. A creator should recognise this from the editors they already use.

## Reference mockups

In `design/mockups/` (the author exports PNGs there as well; the `.dc.html` files are readable HTML with inline styles and SVG, from which you can read sizes, spacing and colours). **These replace the older mockups of the same names**; delete `Expanded.dc.html` and `NarrowOpen.dc.html`, which are obsolete.

| File | Shows |
| --- | --- |
| `Viewer.dc.html` | The Viewer tier: overlay controls on the picture |
| `Main.dc.html` | The Studio tier with a range set and the pointer hovering the timeline |
| `Default.dc.html` | The Studio tier with no range yet (handles idle) |
| `Capture.dc.html` | The Capture menu open |
| `ViewMenu.dc.html` | The View menu open (the Image section is built in step 7) |
| `Narrow.dc.html` | The Studio tier at 390 px |

They are a **visual target, not code to copy**. Rebuild with the real Video.js components and our tokens. Where a mockup and this brief disagree, this brief wins. The icons in the mockups are placeholders: **keep the current icon set** (add the few missing ones in the same style: bookmark, clear, check); the author will redesign the icons at the end.

## Out of scope

- No image-inspection tools (channels, gain/gamma, zoom, info HUD): step 7. The View menu is laid out to receive an "Image" section later, but it does not appear now.
- No configurator page (step 8) and no icon redesign.
- No user-drawn guides, no creating or storing markers (the host does that).
- No platform logos or imitations of any app's interface.

## Before writing code

1. Read the `NOTES.md` sections for steps 4, 5 and 5b. Key facts: the pro store, the frame clock, `resolveFeatures`, the Review live region and toast, the overlay layer, the focus rules, the contrast script, the screenshot method.
2. Confirm from the installed package how `Menu` and `Popover` handle checkbox and radio items, keyboard navigation (arrows, Home, End, type-ahead), `Esc` and focus return, and whether a time slider markers part exists (`TimeSlider.Markers` or similar) and what it offers. **Use verified names only.** If radio or checkbox roles are missing, add correct ARIA yourself.
3. Look at the current build in a rendered screenshot (see "Visual verification") and note in `NOTES.md` what differs from the mockups.

## Working order and checkpoints

- **Part A (6.1 to 6.9)** first. When it passes, deploy, run the step 2 gate checks on the Viewer, and **tag `step-6a-rework`**. Send the Part A report before you start Part B.
- **Part B (6.10 to 6.16)** second. Deploy and **tag `step-6b-guides`**.

# Part A: the rework

### 6.1 Tiers: Viewer and Studio

- `tier` becomes `'viewer' | 'studio'` (default `'viewer'`). Remove `'share'`, `'review'` and the old `studio` meaning. **Rename everywhere**: types, `resolveFeatures`, `data-tier` values, CSS selectors, file and chunk names (for example `src/pro/review/` becomes `src/pro/studio/`), the dev tier switch, the `?tier=` URL parameter, tests, README, comments and `NOTES.md`. Search for `share`, `review` and `Review` to make sure nothing is left, and keep the words "review" and "share" only where they describe a use case in prose.
- **Viewer** loads no pro code. **Studio** is the full set.
- Feature flag defaults (replace the table from step 3):

| Flag | Viewer | Studio |
| --- | --- | --- |
| `timecode`, `frameStep`, `inOut`, `loop`, `markers`, `shotNav`, `grabFrame`, `copyTimecodeLink`, `posterFrame` | off | on |
| `guides` (a list, or `false`/`true`) | off | all |
| `platformZones` | off | on |
| `channels`, `gainGamma`, `zoom`, `infoHud` | off | on (they have no UI until step 7) |
| `debug` | off | off |

- A host can still turn any single feature on over Viewer or off over Studio with `features`; that is the fine-grained control, and it replaces the old middle tier. Update `resolveFeatures` and its tests accordingly.
- The preview page's tier switch has two segments: **Viewer** and **Studio**.

### 6.2 The Viewer tier

- Overlay layout on the picture, as in `Viewer.dc.html`: a soft bottom scrim, a thin seek bar (white fill, small white thumb, no accent), and one row: Play, mute, time (`0:22 / 1:00`), a spacer, captions, settings, picture-in-picture, fullscreen. Targets 40 px and up.
- It keeps everything the step 2 gate requires (keyboard, touch gestures, auto-hide with the 2-second rule, captions, error dialog, announcements). It uses the new palette and system typeface from step 5b.
- No change to behaviour from step 2 and 5b other than the rename. Re-run the step 2 gate checks at the end.

### 6.3 Studio layout: the dock

Studio uses the dock layout from step 5b (stage above, dock below, never over the picture, fullscreen includes the dock). Changes:

- The dock has **two rows**: the **timeline row** and the **main row**. The Tools tray, the Tools disclosure button, group labels, the range readout and "Play range" are **removed** (delete the code and tests for them, not just hide them). Remove `toolsOpen` from the store.
- Dock padding: 14 px top, 16 px sides, 12 px bottom; 10 px between the rows. The dock should be about 116 px high at 1440 px wide.
- **The preview page:** the player is centred, up to **1280 px** wide, and the stage is sized so that stage plus dock fit the viewport height where possible (at 1440×900 the picture is about 720 px high and the page does not scroll). The top bar has the product name, the file info, the Viewer/Studio switch and the density switch.

### 6.4 The timeline (compact)

Study `Main.dc.html` and `Default.dc.html`.

- **Height:** about 46 px: a 22 px ruler, then a 16 px track, with the buffered range as a 2 px line under the track.
- **Playhead:** a 3 px white line with a thin dark outline from the top of the ruler through the track, topped by a small white pentagon head on the ruler. **No permanent time bubble.** The current timecode is in the main row.
- **Hover and drag bubble:** while the pointer hovers the timeline, a hairline marks the position and a small dark bubble above it shows the full timecode (and the storyboard thumbnail if the media has one). While a handle or the playhead is dragged, the bubble shows its timecode. The bubble floats above the dock and may overlap the bottom edge of the picture; it must not be clipped (the dock has `overflow: visible` and a z-index above the stage) and must stay inside the container horizontally.
- **Ruler:** compact seconds-first labels as in step 5b.6; ticks every second, taller every 5 seconds. The playhead head may sit over a label: where it does, the label stays readable (draw the head behind the label text or shift the label); look at the screenshots and fix any collision.
- **Chapters:** 2 px gaps in the track at chapter boundaries.
- **Buffered range:** a 2 px dim line under the track.

### 6.5 The range: handles on the timeline

Replace In/Out buttons and the range readout with direct manipulation.

- **Handles are always present at both ends of the track**, like After Effects' work-area bar: a 9 px wide, 24 px tall tab at each end, with the outer corners rounded. When the range is the whole video (In and Out unset), they are neutral (`--pro-handle-idle: #77777E`). As soon as In or Out differs from its end, the handle shows in `--pro-accent`.
- **Band:** drawn only when a point is set: from In (or the start) to Out (or the end); the unplayed part in `--pro-range`, the played part in `--pro-accent`, as in step 5b.5. Outside the range stays neutral. The playhead stays visible over the band (check contrast and record it).
- **Pointer:** drag a handle to set the point; it snaps to frame boundaries and **magnetically to the playhead and to markers** within 5 px; dragging a handle back to its end (within one frame) unsets it. Double-clicking a handle unsets that point. The store's invariants apply (order, clamping, swap or reject rule). `onInOutChange` fires on release, not on every move.
- **Keyboard:** each handle is a focusable `role="slider"` with the name "In point" or "Out point", `aria-valuemin`, `aria-valuemax`, `aria-valuenow` in seconds and `aria-valuetext` in timecode (or "Start" / "End" when unset). With a handle focused: `←` and `→` move it one frame, `Shift+←` and `Shift+→` ten frames, `Home` and `End` to its limits, `Delete` or `Backspace` unsets it. These keys apply only while the handle has focus and do not trigger the global map.
- **Global shortcuts stay:** `I` sets In at the current frame, `O` sets Out, `Shift+I` and `Shift+O` unset them.
- **Touch:** handle hit areas are at least 44 px tall and 44 px wide (extending above and below the track, not covering the playhead's scrub area beyond reason); dragging must not scroll the page (`touch-action: none` on the handles and the track only).
- **Why both:** a pixel covers more than one frame (60 s at 24 fps is 1440 frames over about 1250 px), so dragging is the coarse tool; the precise one is to step to the frame and press `I` or `O`, or to focus a handle and nudge it. Say this in the README.
- Announcements through the Review live region: "In point set at 00:00:14:00", "Out point moved to…", "Range reset".

### 6.6 Markers: one visual

- Markers come from the host's `markers` prop; chapters come from the media's chapter track. The skin **displays and navigates** them and reports clicks. It never creates or stores them. State this in the README.
- **One visual:** a small pin (an 8×10 px downward-pointing flag in `--pro-text-dim`) sitting on the ruler at the marker's time. A marker with an `end` time also gets a 2 px line along the ruler from the pin to the end time. **No count badges and no cluster logic**: overlapping pins may overlap. Draw later markers on top.
- Pins have a 24 px wide hit area. Hover or focus shows a tooltip with the label and timecode; click or Enter seeks to the marker (snapped to the frame rule from step 4) and calls `onMarkerSelect`.
- **Keyboard access without a tab stop per pin:** `[` and `]` (previous and next cut, from chapters, or from markers if there are none, as in step 4) and the **Markers menu** in the toolbar (6.7). Do not add a tab stop per pin.
- A selected marker (the one last chosen) shows its pin in `--pro-accent` until the playhead moves away from it.
- The demo passes sample markers and an event log (kept from step 5); the configurator in step 8 will offer a switch for them.

### 6.7 The main row

A three-column grid (`1fr auto 1fr`), as in `Main.dc.html`.

**Left: timecode**
- The recessed field (`--pro-surface-0`, 8px radius, 150 px wide, 17 px tabular type) with the current timecode, and next to it the dim text `of 00:01:00:00` (the duration). The click-to-toggle behaviour from step 4 stays, with `aria-pressed`.

**Centre: transport**
- Two segmented controls either side of **Play** (neutral filled button): previous cut and step back; step forward and next cut. Then a **Loop** toggle (`--pro-on` when on) and, **only when a range is set**, a small ✕ **Reset range** button next to it. Loop loops the range if one is set, otherwise the whole video.

**Right: tools and playback**
- **Markers** menu button (bookmark icon, a small count badge, a chevron): shown only when markers exist and the flag is on. Its menu lists each marker (label and timecode; and the chapters under a second heading if the media has chapters); activating one seeks to it and fires `onMarkerSelect`.
- **Capture** menu button (camera icon and chevron). Menu items: **Grab frame** (download a PNG, shortcut `G`), **Copy frame image**, a divider, **Copy link at timecode**, **Use frame as poster**. Same behaviour, names and errors as step 4.
- **View** menu button (eye icon, a count badge of active overlays, a chevron). Its menu is built in Part B; in Part A it is disabled with the tooltip "Coming next" (hidden if `guides` is off).
- A hairline divider, then **Captions** (toggle), **Settings** (speed, quality, captions track, and on narrow layouts mute and markers), **Mute** with a short volume slider, and **Fullscreen**.
- The menu buttons use `aria-haspopup="menu"` and `aria-expanded`, and open **upward** over the picture's bottom edge. They are real `Menu`s in `Popover`s: arrow keys, Enter, `Esc`, focus returns to the button.
- Tooltips on every control with the shortcut after the name, in dim type. Menu buttons show icon and chevron only; at widths of 1500 px and up you may add the words "Capture" and "View".
- Targets are 34 px tall in `comfortable` density on desktop (28 px in `compact`, never below 24 px), 44 px on touch.

### 6.8 Responsive behaviour (container width)

Use container queries. Study `Narrow.dc.html`.

| Container width | Layout |
| --- | --- |
| 900 px and up | The main row exactly as in 6.7 |
| 560 to 899 px | One row. It sheds in this order as it narrows: the volume slider, the "of duration" text, picture-in-picture (into Settings), the captions button (into Settings) |
| below 560 px, or `(pointer: coarse)` | Timeline row; one row with the timecode (100 px), step back, step forward, Play, previous cut, next cut (40 to 44 px each); one row with a segmented **In**, **Out**, **Loop** control (44 px) on the left and **Capture**, **View**, **Settings**, **Fullscreen** on the right (44 px each). Volume, mute and markers live in Settings. The In and Out buttons appear here because touch has no keyboard: they set the point at the playhead |

- At 320 px nothing overflows or clips. If a row cannot reach 44 px at 320 px, say so in the report and use at least 40 px; if cut buttons must go, keep `[` `]` and the Markers menu working.
- Play, step, the timecode and Fullscreen are always visible.

### 6.9 Tab order, ARIA, tokens and visual rules

- **Tab order follows the visual order:** timeline slider, In handle, Out handle, timecode, transport (previous cut, step back, Play, step forward, next cut), Loop, Reset range, Markers, Capture, View, Captions, Settings, Mute and volume, Fullscreen. (With the tray gone the old mismatch disappears; update the tests that asserted the old order.)
- Not a `role="toolbar"`: arrow keys frame-step, so no roving focus. The main row's segments are `role="group"` with names ("Transport", "Playback").
- Tokens: those from step 5b, plus `--pro-handle-idle: #77777E` (check its contrast against the track and record it). The accent stays reserved: the played part of the range, the active handles, the focus ring and a selected marker. Toggled-on controls are graphite (`--pro-on`) with the short bar from step 5b.
- Remove everything that is now dead (tray, Tools button, bubble, lane, group labels), including its CSS and tests.

# Part B: View menu and guides

### 6.10 The picture rectangle

Guides must be drawn on the **picture**, not the stage.

- Compute the picture's rectangle inside the stage: the largest rectangle with the video's aspect ratio (`videoWidth / videoHeight`) that fits the stage, centred (as `object-fit: contain` produces). Note any other `object-fit` handling.
- Expose it as CSS variables on the container (`--pro-picture-x`, `--pro-picture-y`, `--pro-picture-w`, `--pro-picture-h`, in CSS pixels) and size the **overlay layer** to that rectangle, so every guide is drawn in percentages of the picture.
- Recompute on: stage resize (a `ResizeObserver`), the media element's `loadedmetadata` and `resize`, fullscreen entry and exit, density change and a source change. Before metadata, draw no guides.
- A **pure function** (stage width and height, video width and height, fit mode → rectangle) with tests: 16:9 in a 16:9 stage, 16:9 in a taller stage, 16:9 in a wider stage, 9:16 in a 16:9 stage, 1:1, odd sizes.
- The overlay layer stays `aria-hidden="true"` and `pointer-events: none`, above the picture and below the controls and tooltips. Pixel aspect ratio is ignored; note it in `NOTES.md`.

### 6.11 The View menu

Study `ViewMenu.dc.html`. The View button becomes active and opens a two-column menu (wide: two columns; narrow: one column, scrolling inside the container).

| Column | Section | Items | Behaviour |
| --- | --- | --- | --- |
| Left | Safe areas | Title safe, Action safe | Independent checkboxes |
| Left | Composition | Rule of thirds, Centre cross | Independent checkboxes |
| Left | Crop | None, 2.39:1, 1.85:1, 1:1, 4:5, 9:16 | One at a time (radio). Dims the picture outside the crop |
| Right | Platform zones | None, YouTube Shorts, Instagram Reels, TikTok | One at a time (radio); each platform item has a dim "Approximate" sub-label |
| Footer | | Hide guides / Show guides, with the shortcut `Shift+V` | Turns every guide off and restores the previous set |

- The `guides` feature flag restricts the menu: a host's list (for example `['title-safe', '9:16']`) removes everything else; an empty section is not shown; radio sections show only the allowed values plus None. `platformZones: false` removes that section; `guides: false` removes the View button. Valid ids: `title-safe`, `action-safe`, `thirds`, `centre`, `9:16`, `4:5`, `1:1`, `2.39`, `1.85`; zones: `shorts`, `reels`, `tiktok`. Update `resolveFeatures`, its types and tests.
- The structure must make it easy to add an **"Image"** section under Platform zones in step 7.
- Menu items use `menuitemcheckbox` and `menuitemradio` with correct checked state. Space or Enter toggles; the menu stays open after toggling, so several guides can be switched; `Esc` closes and returns focus to the View button; Tab closes it and moves on.
- The View button's badge shows the number of active overlays (a crop or a zone counts as one); its accessible name includes the count ("View, 3 guides on").
- **`Shift+V`** turns all guides off and on (the same as the footer item), only with Shift alone held and not in a text field; add it to the help dialog. If it conflicts with anything, choose another and tell the author.

### 6.12 Drawing the guides

Guides must read over **any** footage, white and black included, without becoming noise.

- **Lines:** 1 px white at about 75% opacity with a **dark 1 px outline or shadow**, so they stay visible over bright and dark areas. Dashed for safe areas; solid for thirds and the centre cross. **No accent colour** on guides.
- **Labels:** 10 to 11 px system font, `--pro-text` on a dark translucent pill, only for Title safe, Action safe and the platform zone names; hidden when the picture is narrower than about 480 px.
- One SVG (or CSS) layer per guide, not per line; crisp on high-DPI screens.
- **Geometry** (proposed; replace with verified values and record the change): action safe is the central 93% of width and height, title safe the central 90% (commonly cited for HD broadcast, EBU R95 and SMPTE RP 218; describe it as "Broadcast" in the menu's dim sub-line). Thirds at 1/3 and 2/3. The centre cross is a short cross (about 5% of the picture height). Crop masks are a centred rectangle of the chosen ratio, as large as fits; the area outside it is dimmed with `rgba(0,0,0,.55)` and the crop's edge has the outline style above; if the picture already has the ratio, only the outline shows.
- Compute all geometry in **pure functions** from the picture rectangle and the ratio, with tests.

### 6.13 Platform zones

Zones show where an app's own interface will cover a vertical video.

- Zones are drawn **inside the 9:16 frame**: the whole picture if the video is 9:16, otherwise the centred 9:16 crop. **Selecting a zone turns on the 9:16 crop** (dimming outside it) and the Crop radio shows 9:16; picking another crop clears the zone, and the announcement says so.
- Each platform has a small data table in **one file** (for example `platform-zones.ts`), rectangles in **percent of the 9:16 frame**: a top band, a bottom band (captions, profile, sound), and a right-hand rail (like, comment, share), each with a label. Adding or editing a platform means editing that file only.
- **Look up publicly documented safe-zone guidance** for YouTube Shorts, Instagram Reels and TikTok (the platforms publish creative guidance with margins), and for broadcast safe areas. Use those numbers and record the numbers and sources in `NOTES.md`. If you cannot reach them, use these proposed defaults and mark them **unverified** in `NOTES.md`:

| Platform | Top | Bottom | Right rail |
| --- | --- | --- | --- |
| YouTube Shorts | 0–10% | 80–100% | right 14%, from 38% to 80% height |
| Instagram Reels | 0–12% | 72–100% | right 12%, from 40% to 82% height |
| TikTok | 0–10% | 74–100% | right 16%, from 38% to 84% height |

- Draw each zone as a translucent region (about 35% black plus the dashed outline) with a small label ("Top bar", "Captions and profile", "Buttons").
- **Be honest:** each platform item says "Approximate", and the help text says app layouts change and creators should check the platform's current guidance. Never claim official accuracy.

### 6.14 Announcements, data attributes and events

- Every View change is announced through the **Review live region** from step 4 (no second one): "Title safe on", "Crop 9:16", "Platform zones: TikTok", "Guides hidden", "Guides shown".
- `Container` gets `data-guide-title-safe` and so on (one per active guide, with `:` and `.` replaced by `-`), `data-crop="9-16"` and `data-zones="tiktok"`.
- New optional event `onViewChange?: (view: { guides: string[]; crop: string | null; zones: string | null }) => void`, fired when the set changes (not on first load). Add it to the props type and the README.

### 6.15 Remembered choices

- Persist: active guides, crop, zone and `timeDisplay`. Not: In/Out, loop, the playhead.
- `localStorage` under one namespaced key (for example `videojs-pro:v1`), in `try/catch` (storage can be blocked, full or empty; the skin must work without it), **validated on read**: unknown ids, values not allowed by the current `features`, wrong types and invalid JSON are dropped silently, never thrown.
- New prop `persist?: boolean | string`: `true` (default) uses the default key, a string uses that key, `false` turns it off.
- **The host's `features` always wins** over a remembered value.
- Apply remembered state on first render without a visible flash. Pure serialise and parse functions with tests. Note in `NOTES.md` that storage can come back empty and that nothing depends on it.

### 6.16 Tests and checks (for the whole step)

Unit tests (pure functions):
- `resolveFeatures` for the new tiers and flags (including `1.85` and the zone ids), and that no `share` or `review` value is accepted.
- Store: In/Out unset (null) semantics, dragging back to the end unsets, the swap or reject rule, no `toolsOpen`.
- Handle drag maths: snapping to frames, the magnetic snap to the playhead and markers within 5 px, release rounds to a frame.
- Marker layout: one pin per marker, `end` spans, markers at 0 and at the duration, 200 markers.
- Picture rectangle, guide, crop mask and platform zone geometry (6.10 to 6.13); View menu model (what is offered for different `features`; radio sections hold one value; selecting a zone sets crop 9:16; picking another crop clears it; Hide and restore); serialise and parse (valid, invalid JSON, unknown ids, disallowed ids, wrong types); badge count.
- Ruler labels and tick chooser still pass.

Manual checks, recorded in `NOTES.md` with browser and result:
- Keyboard only: every control in the new tab order; both handles by arrow keys and `Delete`; `I`, `O`, `Shift+I`, `Shift+O`; all three menus open, navigate and close with focus returning; `Shift+V`.
- Mouse: drag both handles, double-click to unset, hover bubble, click a marker pin, scrub the playhead.
- Touch (device or emulation, say which): the narrow layout with In/Out buttons; dragging a handle does not scroll the page.
- Guides sit on the **picture** with letterboxing, in fullscreen (if it can be driven), and with a taller and a wider stage; each guide over a pure white, a pure black and a mid-grey frame.
- Remembered choices survive a reload and yield to the host's `features`.
- The Viewer tier looks and behaves as at the end of step 2 (re-run the keyboard-only and narrow-embed checks) and requests **no pro chunk**.
- Chunk sizes: the Viewer path must not grow by more than a few hundred bytes; record the sizes.

### Visual verification (required, both parts)

In step 4 nothing was looked at because the browser window was hidden; in step 5b screenshots were taken with headless Chromium. **Keep doing that.**
- Take real screenshots at 1440×900, 1100×800, 800×800, 390×800 and 320×700, in Viewer and Studio, and **open and look at them**. Compare with the mockups, fix what is wrong, repeat.
- Save the final ones to `design/screenshots/step-6/`, named by width and state.
- Also capture: the three menus open (Markers, Capture, View) at 1440 and 390; the hover bubble; both handles idle and active; each guide on its own; all guides together; a 9:16 crop with each zone; the 2.39 crop; guides over white, black and mid-grey; the picture letterboxed (guides on the picture, not the stage); focus rings on the handles and on the three menu buttons.
- Say in your report how you took them and what you could not capture.

### Deploy

Deploy and test on the **public URL** after each part. Update `README.md`: the tiers, the layout rule for hosts, the range handles and shortcuts, the marker model (host data, one visual, the menu), the View menu, the guide ids and zones, `onViewChange`, `persist`, `Shift+V`.

## Acceptance criteria

**Part A**
- [ ] Only two tiers exist everywhere in code, tests and docs: Viewer and Studio.
- [ ] Studio shows the compact timeline (about 46 px), the white playhead with no permanent bubble, a hover bubble, one marker pin type on the ruler, and the three-column main row.
- [ ] The range is set by dragging handles that are always on the track, by `I`/`O`, and by arrow keys on a focused handle; In/Out buttons appear only on narrow or touch layouts.
- [ ] Markers, Capture and View are real menus with correct keyboard behaviour; the Markers menu lists markers (and chapters).
- [ ] The tray, the Tools button, the range readout, "Play range", the bubble and the lane are gone, including their code.
- [ ] The picture is about 720 px high at 1440×900 and the page does not scroll; the dock stays below the picture, also in fullscreen.
- [ ] The Viewer passes the step 2 gate again and loads no pro code.

**Part B**
- [ ] The View menu has the sections above, restricted by `features`.
- [ ] Every guide draws on the picture rectangle (also letterboxed and in fullscreen), toggles from the menu and with `Shift+V`, and is legible over white, black and mid-grey.
- [ ] Platform zones come from a data file, are labelled "Approximate", and selecting one turns on the 9:16 crop.
- [ ] Choices are remembered, validated, overridden by the host's `features`, and storage failures never break the skin.
- [ ] `onViewChange` fires; changes are announced through the Review live region.

**Both**
- [ ] Screenshots exist at all widths and you looked at them. Tests and build pass; the public URL works; git history is clean, one commit per requirement group, with the attribution lines from your session instructions.

## Report back (two short reports, one per part)

**Part A report**
1. The public URL and the screenshot folder; how you took the screenshots.
2. What differs from the mockups, and why.
3. How the handles work with pointer, keyboard and touch; whether magnetic snapping feels right.
4. Contrast ratios: the playhead over the band, the idle and active handles, and anything that changed.
5. Chunk sizes: Viewer versus Studio. Anything dead you removed.
6. Anything unverified.

**Part B report**
1. The public URL and the screenshots.
2. The verified safe-zone numbers and their sources, or which values stayed unverified.
3. How the picture rectangle is computed and updated; any workaround.
4. Any shortcut conflict (`Shift+V`) and what you chose.
5. Chunk sizes and anything unverified, and anything that will affect step 7 (the Image section goes into the View menu; the image tools reuse the picture rectangle).
