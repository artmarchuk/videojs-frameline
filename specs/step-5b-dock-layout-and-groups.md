# Step 5b: Dock layout, progressive disclosure and visual restyle

Read `PROJECT-OVERVIEW.md`, `NOTES.md` and this file before you start. Run this **after step 5 (ruler timeline) is finished and deployed**, and before step 6. Estimated time: 1.25 hours.

**This file overrides step 5 and step 2 wherever they conflict**: the palette, the typeface, the ruler labels, the playhead and the range band all change here.

## Why this step exists

The author reviewed the step 4 Review bar and the first dock mockup, and found:

1. Controls that cover the picture are wrong for a tool for video creators. They belong **below** the video.
2. The preview page shows the video too small. In an editor the picture is the biggest thing on the screen.
3. The In/Out range is not visible enough.
4. There is too much of everything: a long strip of equal buttons, a heavy monospace typeface (the slashed zeros add noise), and an acid lime accent used everywhere.

The direction now: **calm, quiet, macOS-like**. A clean system typeface, a soft blue accent that is kept for the most important indications, and secondary tools hidden behind one disclosure control.

**North star reminder:** Video.js PRO is a skin for video creators. A creator looks at the picture first. The controls should stay out of the way until needed, and then be organised by task.

## Reference mockups

In `design/mockups/` (the author exports PNGs there; the `.dc.html` files are readable HTML with inline styles and SVG, from which you can read sizes, spacing and colours):

- `Main.dc.html`: desktop, tools closed (the default).
- `Expanded.dc.html`: desktop, tools open.
- `Narrow.dc.html` and `NarrowOpen.dc.html`: 390 px, tools closed and open.

They are a **visual target, not code to copy**. Rebuild with the real Video.js components and our tokens. Where a mockup and this brief disagree, this brief wins. The icons in the mockups are placeholders: **keep the current icon set**; the author will redesign it at the end.

## Out of scope

- No new features, no new behaviour. Guides, the View menu's content and Studio tools belong to steps 6 and 7; here the **View** control gets its place and does nothing yet (disabled, tooltip "Coming in the next step"; hidden if the `guides` flag is off).
- No icon redesign.
- The Share tier stays an overlay on the picture. It adopts the new palette and typeface (5b.2) but not the dock.

## Before writing code

1. Confirm from the installed package how `Container` and the fullscreen request work: which element goes fullscreen, and whether extra children (the dock) can live inside it. **Use verified behaviour only.**
2. Take a real screenshot of the current Review tier (see 5b.9) and write down in `NOTES.md` what you think is wrong, in your own words, before you change anything.
3. Record verified names under "Verified APIs".

## Requirements

### 5b.1 Dock layout

Add `layout?: 'dock' | 'overlay'` to `ProSkin`.

- **Defaults:** `share` → `overlay`; `review` and `studio` → `dock`. A host can override either way. Add `data-layout` on `Container`; document the prop; show it in the debug readout.
- **Structure in dock mode:** inside `Container`, a **stage** (the media element, letterboxed on `--pro-surface-0`) and below it a **dock** (a full-width panel on `--pro-surface-1` with a top hairline). The dock is part of the layout flow: it takes its own height, never overlays the picture and never auto-hides.
- **Aspect ratio applies to the stage, not to the whole component.** The component's total height is the stage plus the dock. State this in the README for hosts.
- **Fullscreen:** the fullscreen request must go to the element that contains **both** the stage and the dock, so the dock stays visible in fullscreen; the stage fills the rest of the screen and the picture is letterboxed inside it. If the installed Video.js can only fullscreen the media element, find the documented way to fullscreen the container; if there is none, tell the author in your report before choosing a workaround.
- Do **not** show Video.js's overlay controls, scrim or auto-hide in dock mode. A click on the picture still toggles play and pause.
- Captions are drawn by the browser on the picture; confirm they are readable on the stage and not clipped.
- An optional `--pro-frame-border` token draws a 1px hairline and 10px radius around the component (the preview page uses it; the skin itself does not force it).

### 5b.2 Tokens: palette and typeface (replaces step 2's look)

Update the tokens file, the contrast script and everything that used the old lime.

**Typeface:** the **system UI stack only**:
`-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable", "Segoe UI", system-ui, sans-serif`.
- **Remove the monospace font and its files** from the project. No webfont at all.
- Use `font-variant-numeric: tabular-nums` for every changing number (timecode, readouts, labels), so digits do not jitter, and **never** a zero with a slash or dot. Check that digits do not shift width on macOS, Windows and Android defaults; where a platform font has no tabular figures, say so in `NOTES.md`.
- Weights 400 and 500 for most text, 600 only for the timecode bubble and small badges. Sentence case everywhere; no uppercase labels, no letter-spaced labels.
- Sizes in the scale unit: UI text 13px, small text 11 to 12px, the timecode field 17px, the ruler labels 10.5px.

**Colour (dark only), proposed values; recompute contrast and adjust if a ratio fails:**

| Token | Proposed | Use |
| --- | --- | --- |
| `--pro-surface-0` | `#0E0E10` | Behind the picture; the recessed timecode field |
| `--pro-surface-1` | `#1E1E20` | The dock, menus |
| `--pro-surface-2` | `#2C2C2F` | Control fill, segmented controls, the neutral track |
| `--pro-surface-3` | `#3A3A3E` | Hover, tooltips, small badges |
| `--pro-on` | `#46464B` | A toggle that is **on** (Loop on, tools open) |
| `--pro-line` | `#333336` | Hairlines |
| `--pro-text` | `#F2F2F4` | Primary text and icons |
| `--pro-text-dim` | `#9A9AA0` | Secondary text |
| `--pro-accent` | `#5B9DFF` | Soft blue, **reserved** (see below) |
| `--pro-accent-ink` | `#0B1220` | Text on the accent |
| `--pro-range` | `#4D7BC1` | The not-yet-played part of the range band |

**The accent is reserved.** It is used only for: the played part of the range band, the In/Out bracket handles, the keyboard focus ring, and a selected marker. Nothing else is blue. In particular:
- **Toggled-on states use `--pro-on`** (a lighter graphite fill with the usual white icon), not the accent.
- The **Play** button is neutral: a `--pro-text` fill with a dark icon.
- The **playhead is white** (`--pro-text`) with a thin dark outline, and its bubble is white with dark text.
- Guides and overlays are white at reduced opacity with a dark outline, so they read over any footage; step 6 decides the details.

**Contrast:** compute with the project's script and record in `NOTES.md`. For reference, the proposed values give about: text on the dock 14.9:1, dim text 5.9:1 on the dock and 5.0:1 on controls, accent on the dock 6.1:1, accent-ink on accent 6.9:1, white playhead on the unplayed band 4.5:1, the unplayed band against the neutral track 3.3:1. White text on the accent is only 2.7:1, so **never put white text on the accent**. Every pair listed in the earlier steps (focus ring, slider handles, track) must still pass; recompute them.

**Shape:** 8px radius on groups and the timecode field, 6px on buttons, 10px on the component frame; hairlines and surface steps separate things; the only shadow is a soft one on popovers and tooltips.

Also update the README and `PROJECT-OVERVIEW.md`'s "Look" section to describe the new look.

### 5b.3 The dock: rows

The dock has these rows, top to bottom:

1. **Timeline row:** the step 5 timeline (see 5b.6 for what changes).
2. **Main row (always visible):** Transport, Timecode, the **Tools** disclosure, a spacer, and Playback at the right.
3. **Tools tray (only when open):** Range, Capture and View, inline labels, one row on desktop.

**Main row contents**

| Control | Details |
| --- | --- |
| Transport | Two segmented controls either side of Play: previous cut and step back; step forward and next cut. **Play** is a neutral filled button, a bit wider than the others |
| Timecode | A recessed field (`--pro-surface-0`, 8px radius) with the full timecode in 17px tabular type and the fps small and dim at its right edge. The click-to-toggle behaviour from step 4 stays |
| Tools | **One disclosure button** labelled **"Range, Capture, View"**, with a chevron. When closed, it also shows a dim summary of what is set, for example `17 s range · 3 guides` (only the parts that are set; nothing if none). `aria-expanded` is set and updated; Enter or Space toggles it. When open it uses `--pro-on` |
| Playback | At the far right: mute and a short volume slider, captions, settings, picture-in-picture, fullscreen |

**Tools tray contents (when open)**

| Group | Controls |
| --- | --- |
| Range | An inline label "Range" (12px, dim), then one segmented control: **In**, **Out** and **Loop** (an icon; `--pro-on` when loop is on), and a two-line readout: `00:00:14:00 – 00:00:31:00` and `17 s · 408 frames` |
| Capture | The label "Capture", then one segmented control: **Grab frame** with a small chevron for its menu (download, copy), **Copy link**, **Use frame as poster** |
| View | The label "View", then one button: eye icon, "Guides", a small count badge, a chevron (step 6 fills it) |

Rules:
- **Progressive disclosure, not hiding:** every shortcut (`I`, `O`, `R`, `G` and the others from step 4) works whether or not the tray is open. The tray only changes what is visible.
- The tray opens and closes by the Tools button, and the button has a visible tooltip with its state. Opening the tray moves focus nowhere; the first control in the tray is the next Tab stop after the Tools button. **Closing it while focus is inside it returns focus to the Tools button.**
- **Default state:** closed. The choice is stored (`toolsOpen` in the pro store) and remembered per browser together with the other View choices in step 6. Add `toolsOpen` to the store with its tests now; the persistence arrives in step 6.
- Opening the tray makes the dock taller. In a host with a fixed total height the stage gets shorter and the picture is letterboxed; in the preview page see 5b.7.
- No group labels above controls; inline labels in the tray only. No keycap chips; shortcuts live in tooltips and the help dialog.
- Every group is `role="group"` with an `aria-label` ("Transport", "Range", "Capture", "View", "Playback"). The dock is **not** a `role="toolbar"` and has no arrow-key roving focus, because the arrow keys frame-step. Every control is a normal tab stop.
- Tab order follows the visual order: timeline slider, In handle, Out handle, Transport, Timecode, Tools, the tray's controls (when open), Playback.
- Hairline dividers (`1px`) between groups in the tray; spacing on the 4 px grid.

### 5b.4 Responsive behaviour (container width)

Use container queries on the component, not viewport queries.

| Container width | Layout |
| --- | --- |
| 900 px and up | The main row on one line; the tray on one line |
| 560 to 899 px | The main row on one line; the tray wraps to two lines if it must |
| below 560 px (see `Narrow` mockups) | Timeline row; one row with the timecode, step back, step forward, Play, previous and next cut (100 px timecode field, buttons about 40 to 44 px); one row with the Tools button filling the space, Mute and Fullscreen. Captions, settings, PiP and volume go into a **More** menu only if they cannot fit; otherwise keep them. The tray opens as stacked rows: Range, Capture, View, each with a 56 px label column and 44 px controls |

- Play, step, timecode and Fullscreen are always visible.
- At 320 px nothing overflows or clips. Targets are at least 24 px, and **44 px on touch**; if a row cannot reach 44 px at 320 px, say so in the report and use at least 40 px.

### 5b.5 The range band (replaces step 5's fill)

- With **both** points set, the range is a solid band along the track between In and Out, at the full track height: the **unplayed** part in `--pro-range`, the **played** part (from In to the playhead) in `--pro-accent`. Outside the range the track stays neutral (`--pro-surface-2`). In/Out **bracket handles** (3px `--pro-accent` strokes on the outer sides, extending slightly above and below the band) mark the ends.
- With only one point set, draw the open side to the end of the track with a fading edge.
- With **no range**, the track shows the normal progress: neutral track and an accent fill up to the playhead.
- The playhead is a 3px white line with a thin dark outline running from the bubble through the track; the bubble is white with dark 12px tabular text and shows the **full timecode**.
- Chapter boundaries are 2px gaps in the track (`--pro-surface-1`), as in step 5.
- Contrast to record: the playhead over the unplayed band and over the played band; the unplayed band against the neutral track (at least 3:1); the bracket handles against both.
- Keep the step 5 handle behaviour (drag, keyboard, announcements).

### 5b.6 Ruler labels (replaces step 5's label format)

- The ruler labels use a **compact, seconds-first format**, like After Effects: `0s`, `5s`, `10s` … for durations under a minute; `0:30`, `1:00`, `1:30` for durations that need minutes; `1:00:00` only for hours. Never show hours or minutes that are zero. The unit suffix `s` appears only in the seconds-only format.
- Tick marks: minor ticks every second, taller ticks every 5 seconds, full-height ticks at labelled positions; the tick chooser from step 5 picks the intervals from the width. Ticks are `--pro-text-dim`-ish greys; labels 10.5px tabular, dim.
- **The playhead bubble, the timecode field, the In/Out readouts and the hover bubble keep the full `HH:MM:SS:FF` timecode** (or seconds in the seconds display mode). Only the ruler is compact.
- Update the tick-label unit tests for the new format: for example 10 s, 60 s, 90 s, 10 min and 3 h durations; labels never closer than 80 px; no zero hours or minutes.

### 5b.7 The preview page: a monitor

- A full-bleed dark workspace on `--pro-surface-0`/the page background: a slim top bar (about 56 px) with the product name, the file info (name, resolution, fps) in dim type, and on the right the **tier switch** (Share, Review, Studio, one segmented control) and the density switch. Both are visible without `?debug`; `?debug` still adds the debug readout and the event log.
- The player is centred, up to about 1200 px wide, and sized so that **stage plus dock fit in the viewport height** where possible (compute the stage's `max-height` from the viewport, the top bar, the current dock height and the margins). At 1440×900 the whole page must fit without scrolling, **with the tray open or closed**: when the tray opens, the stage gets shorter and the picture is letterboxed.
- Below 800 px, the page uses the full width with 16 px side padding.
- Keep the sample markers, chapters and the event log from step 5.

### 5b.8 Polish rules

- Icon-only buttons have no visible border until hover or focus; segmented controls sit on `--pro-surface-2`. Hover goes to `--pro-surface-3`.
- Focus ring: 2px `--pro-accent` with a 2px dark gap, on every control and on the timeline handles.
- Transitions under 120 ms; none under `prefers-reduced-motion`.
- Tooltips: `--pro-surface-3`, 6px radius, soft shadow, with the shortcut shown dim after the name; never clipped by the container.
- If anything in the current build still looks clunky next to the mockups, fix it and say what you changed.

### 5b.9 Visual verification (required)

In step 4 nothing was looked at because the driven Chrome window was hidden. **Do not repeat that.**
- First check that you can take a real screenshot. If not, use headless Chromium (for example Playwright with its bundled Chromium, installed if the network allows) to render the preview page at **1440×900, 1100×800, 800×800, 390×800 and 320×700**, in Review and Studio, with the tray open and closed, and open the images with Read.
- Compare with the mockups. Fix what is wrong. Repeat until you would show it to a designer.
- Save the final screenshots to `design/screenshots/step-5b/`, named by width and state.
- Also capture: fullscreen on desktop (if the browser can be driven), a focus ring on three different controls, the range band with the playhead inside and outside it, and the ruler at 10 s, 60 s and 10 min durations.
- Say in your report **how** you took the screenshots and what you could not capture.

### 5b.10 Tests and checks

- Unit tests: layout resolution from tier and prop; the container-width breakpoint chooser; the range band geometry for none, one and both points; the compact ruler labels (5b.6); the `toolsOpen` store action; the tick chooser still keeps its spacing rules.
- Manual checks, recorded in `NOTES.md`: keyboard-only walk through every control in tab order, including opening and closing the tray; fullscreen keeps the dock; the Share tier works as in step 2 with the new palette (re-run the step 2 keyboard-only and phone checks); frame step, In/Out, loop, grab, link and poster work from their new positions with the tray closed (via shortcuts) and open.
- Chunk sizes: Share must not grow by more than a few hundred bytes (removing the monospace font should shrink it); record the sizes again.

### 5b.11 Deploy

Deploy and test on the **public URL**. Update `README.md`: the `layout` prop, the dock's height rule for hosts, the control groups and the Tools tray.

## Acceptance criteria

- [ ] In Review and Studio the controls sit below the picture and never cover it, in the page and in fullscreen.
- [ ] The main row shows only Transport, Timecode, Tools and Playback; Range, Capture and View appear in the tray when Tools is open, and every shortcut works with the tray closed.
- [ ] The look is calm and system-native: system font, no slashed zeros, soft blue used only where listed, and toggles in graphite.
- [ ] The ruler labels are seconds-first and compact; the bubble, timecode field and readouts show full timecode.
- [ ] The range is a clear band between In and Out, with the played part brighter; the white playhead stays visible over it.
- [ ] The preview page shows the player large and fits 1440×900 with the tray open or closed; the tier switch is visible without `?debug`.
- [ ] The Share tier still passes the step 2 gate with the new palette.
- [ ] Contrast ratios are recomputed and recorded; screenshots exist at all widths and you looked at them.
- [ ] Tests pass; build passes; the public URL works; git history is clean with the attribution lines from your session instructions.

## Report back (keep it short)

1. The public URL and the screenshot folder; how you took the screenshots.
2. What you thought was wrong with the old bar (from `NOTES.md`), and what you changed beyond this brief.
3. How fullscreen works with the dock (which element goes fullscreen).
4. Where you chose differently from the mockups or this brief, and why.
5. Recomputed contrast ratios, especially the playhead over the band and the band against the neutral track; any platform without tabular figures.
6. Chunk sizes: Share versus Review.
7. Anything unverified, and anything that will affect step 6 (the View menu goes into the View button in the tray).
