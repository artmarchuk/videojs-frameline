# Dock polish: share link, narrow dock, neutral palette, tactile controls, motion

Read first: `specs/PROJECT-OVERVIEW.md`, `NOTES.md`, `FEATURES.md`, this file.
Start only after the hardening work in the working tree is committed and deployed.

**Scope.** Layout, tokens, styles and one moved action. One new shortcut pair. No new features otherwise. The Viewer tier keeps shipping no Studio code. Everything in the hard rules of `CLAUDE.md` holds.

**Commits.** Commit messages name the change for public readers: no step numbers, no contest talk, no git tags.

---

## 1. Copy link at timecode leaves the Capture menu

### 1.1 Wide dock: a link button attached to the timecode field

- The timecode field becomes a segmented pair: `[ 00:00:14:20 | link ]`. The link button is a ToolButton (icon only, 40 px wide at comfortable density, same height as the field), joined to the field like the other segmented groups: shared outer radius, 2 px gap.
- Why there: the link copies exactly what the field shows. The Capture menu keeps only image actions: **Grab frame** (`G`) and **Copy frame image** (`Shift+G`).
- `of 00:01:51:04` stays after the pair, and still hides under 1040 px as today.
- Accessible name: "Copy link at timecode". Tooltip: the name plus the shortcut `S`.
- After a successful copy, the icon swaps to a check for 1200 ms, the tooltip label reads "Link copied", and the status announcer says "Link copied, 00:00:14:20" (with the current timecode). A refused clipboard keeps today's error message and shows no check.
- Feature flag `copyTimecodeLink: false` removes the button. The field then stands alone, as today.
- If the Capture menu is left with no items (`grabFrame: false`), the Capture button is not rendered.

### 1.2 Shortcuts

| Key | Action | Notes |
|---|---|---|
| `S` | Copy link at timecode | New. Mnemonic "share". `repeatable: false`. Disabled when the flag is off. |
| `Shift+G` | Copy frame image | New. The `G` family: `G` saves the frame, `Shift+G` copies it. `repeatable: false`. |

- Before binding, confirm that neither `s` nor `Shift+g` is used anywhere in the skin (`useHotkey`, `<Hotkey>`) or in the installed `@videojs/react` default hotkey map. Report what you checked. If either collides, stop and report; do not pick another key.
- Add both to the help dialog (`Shift+?`): link in the transport/time group, `Shift+G` next to `G`.
- Add `Shift+G` to the Copy frame image menu item as its shortcut hint, the same way Grab frame shows `G`.

### 1.3 Narrow dock

The link button sits in the second row (see 2.2), not beside the timecode, because row one is full at phone widths.

---

## 2. Narrow dock (narrow player or touch device)

### 2.1 Remove the In and Out buttons

- On the narrow dock, `RangeControls` renders **Loop only** (no In, no Out). The range handles on the timeline stay the way to set the range on touch. `I`, `O` and `Shift+I/O` keep working from a keyboard.
- Nothing else about the range changes. Narrow still has no Reset range button; that is not a regression.

### 2.2 Row two: one row of equal cells

- Order, start to end: **Markers, Loop, Capture, Link, Guides, Zoom, Settings, Fullscreen**.
- Lay the row out as a grid of equal cells: `grid-template-columns: repeat(N, minmax(44px, 1fr))` (or `auto-fit` with the same minimum), each control centred in its cell. This fixes the current bug where the icons crowd the start of the row and the gaps between them are uneven (the "Fit" text button is wider than the icons).
- Every target stays at least 44 × 44 px.
- **Markers** moves out of the Settings menu into its own button in this row. Use the same `MarkersMenu` as the wide dock, without the badge and without the chevron. Remove the narrow-only markers page from the Settings menu (`MarkersSubmenu` via `setSettingsItems`). The button is hidden under the same rule as on wide: no markers and no chapters.
- **Fitting the row.** At 44 px a cell, eight cells need a container of about 382 px (15 px side padding each side).
  - Container under 382 px: the **Zoom** button is hidden on the narrow dock. `Z`, `Shift+Z` and `apiRef.setZoom` still work. Say so in `FEATURES.md`.
  - Container under 340 px: the **Link** button is hidden, and "Copy link at timecode" appears as an item in the Settings menu. Use the existing narrow-only menu item pattern (`.pro-menu-item-dock-narrow`).
  - Verify at 320, 360, 390 and 430 px. If anything still overflows or wraps, stop and report with screenshots; do not invent another fold.

### 2.3 Row one

Row one stays as it is: timecode, step, Play, cut (cut hides under 350 px as today).

---

## 3. Neutral palette (tokens in `src/styles/tokens.css`)

The surfaces lose their slight blue cast and become true neutrals (R = G = B), at about the same lightness as today. A neutral surround is the point of the dark player. The dock moves to macOS's dark window grey, `#1E1E1E`.

| Token | Now | New |
|---|---|---|
| `--fl-surface-0` | `#0e0e10` | `#0F0F0F` |
| `--fl-surface-1` | `#1e1e20` | `#1E1E1E` |
| `--fl-surface-2` | `#2c2c2f` | `#2C2C2C` |
| `--fl-surface-3` | `#3a3a3e` | `#3A3A3A` |
| `--fl-on` | `#46464b` | `#474747` |
| `--fl-line` | `#333336` | `#333333` |
| `--fl-track` | `#85858c` | `#888888` |
| `--fl-text` | `#f2f2f4` | `#F2F2F2` |
| `--fl-text-dim` | `#9a9aa0` | `#9C9C9C` |
| `--fl-text-dim-raised` | `#b2b2b8` | `#B4B4B4` |
| `--fl-ink` | `#1c1c1e` | `#1C1C1C` |
| `--fl-tick-minor` / `-mid` / `-major` | `#55555b` / `#77777e` / `#8e8e95` | `#565656` / `#787878` / `#8F8F8F` |
| `--fl-buffer` | `#4a4a50` | `#4A4A4A` |
| `--fl-handle-idle` | `#77777e` | `#787878` |
| `--fl-ruler-label` | `#b8b8c0` | `#B8B8B8` |

- The accent `#5B9DFF`, `--fl-range` and `--fl-accent-ink` are unchanged.
- Apply the same rule to the `prefers-contrast: more` overrides: same lightness, R = G = B.
- Run `node scripts/contrast.mjs` (both columns). Every pair must pass. If one fails by a hair, nudge that token by the smallest step that passes and note it in NOTES.

---

## 4. Tactile controls

A small step towards macOS: controls read as slightly raised objects, toggles that are on read as pressed in, and the timeline's range, handles and pins read as solid things on a recessed track. No glass, no blur, no translucency over the picture.

### 4.1 One strength token

```css
--fl-bevel: 1; /* 0 = flat */
--fl-hi: rgb(255 255 255 / calc(0.07 * var(--fl-bevel)));
--fl-lo: rgb(0 0 0 / calc(0.35 * var(--fl-bevel)));
```

Derive every highlight and shade below from `--fl-bevel`, so the whole treatment can be tuned or switched off with one value. Set `--fl-bevel: 0` under `forced-colors: active` and `prefers-contrast: more`. Also set `background-image: none` there on every element that gets a gradient.

### 4.2 Treatments

| Element | Resting | Pressed / on |
|---|---|---|
| Control fills (`.pro-tool`, segmented groups, menu triggers, CC, settings, fullscreen) | `background-image: linear-gradient(to bottom, rgb(255 255 255 / calc(.05 * var(--fl-bevel))), transparent 60%)`; `box-shadow: inset 0 1px 0 var(--fl-hi), 0 1px 1px var(--fl-lo)` | Fill `--fl-on`; `background-image: linear-gradient(to bottom, rgb(0 0 0 / calc(.18 * var(--fl-bevel))), transparent 55%)`; `box-shadow: inset 0 1px 2px rgb(0 0 0 / calc(.5 * var(--fl-bevel))), 0 1px 0 rgb(255 255 255 / calc(.05 * var(--fl-bevel)))` |
| "Pressed / on" applies to | `aria-pressed="true"` (Loop), an open menu's trigger (`aria-expanded="true"` or the menu's own open attribute, whichever the installed `Menu.Trigger` sets; check), Zoom when not at Fit, and `:active` on every button | |
| `:active` only | The icon moves down 0.5 px (`translate: 0 0.5px`) | |
| Play (white key) | Gradient `#FAFAFA` to `#E2E2E2` (top to bottom) over the fill; `box-shadow: inset 0 -1px 0 rgb(0 0 0 / calc(.12 * var(--fl-bevel))), 0 1px 2px rgb(0 0 0 / calc(.5 * var(--fl-bevel)))` | `:active`: gradient `#E6E6E6` to `#D6D6D6`, inner shadow as on control fills |
| Timecode field (a recessed well) | `box-shadow: inset 0 1px 2px rgb(0 0 0 / calc(.6 * var(--fl-bevel))), 0 1px 0 rgb(255 255 255 / calc(.05 * var(--fl-bevel)))` | |
| Dock top edge | `box-shadow: inset 0 1px 0 rgb(255 255 255 / calc(.05 * var(--fl-bevel)))` on the dock | |
| Timeline track (recessed) | `box-shadow: inset 0 1px 1px rgb(0 0 0 / calc(.45 * var(--fl-bevel)))` | |
| Range band and its played part | `background-image: linear-gradient(to bottom, rgb(255 255 255 / calc(.16 * var(--fl-bevel))), rgb(255 255 255 / 0) 50%, rgb(0 0 0 / calc(.12 * var(--fl-bevel))))`; `box-shadow: inset 0 1px 0 rgb(255 255 255 / calc(.22 * var(--fl-bevel)))` | |
| Range handles (idle and set) | The same gradient as the band; drop `0 1px 1px rgb(0 0 0 / calc(.5 * var(--fl-bevel)))`; a grip, 1 px wide and 8 px tall, centred: `rgb(0 0 0 / calc(.35 * var(--fl-bevel)))` with a 1 px `rgb(255 255 255 / calc(.2 * var(--fl-bevel)))` line beside it | `[data-dragging]`: drop shadow grows to `0 2px 3px` |
| Marker pins (and the selected pin in the accent) | Top-light gradient as on the band; drop `0 1px 1px rgb(0 0 0 / calc(.6 * var(--fl-bevel)))` | |
| Playhead head | Add drop `0 1px 2px rgb(0 0 0 / calc(.5 * var(--fl-bevel)))`; keep its dark outline | |
| Menus, popups, tooltips | `inset 0 1px 0 rgb(255 255 255 / calc(.06 * var(--fl-bevel)))` added to the current popup shadow. Highlighted menu items stay flat. | |

- The focus ring must still draw on every control. Where it is a `box-shadow`, combine it with the treatment shadow in the `:focus-visible` rule rather than replacing it. Check every control type.
- Nothing is drawn over the picture.

---

## 5. Motion

### 5.1 Tokens

```css
--fl-duration-press: 60ms;  /* entering a pressed or on state */
--fl-duration-quick: 90ms;  /* range band appear; leaving a pressed state */
--fl-duration: 120ms;       /* unchanged: hovers, menus */
```

Set all of them to `0ms` under `prefers-reduced-motion: reduce`, as the existing tokens are.

### 5.2 Rules

1. **Nothing that shows time animates.** The playhead, the timecode digits, the ruler, the handle positions and the band's start and end follow the media and the pointer exactly. Never put `left`, `right`, `width` or `transform: translateX` in a transition on these.
2. **Range band, appear and disappear.** When a range goes from none to set, the band fades and grows from its centre line: `opacity 0 → 1`, `transform: scaleY(0.4) → 1` over `--fl-duration-quick`, with the existing ease. Clearing reverses it over 70 ms. Animate only `opacity`, `transform` and `visibility`. To make this possible, replace `display: none` on `[data-range="none"]` with `opacity: 0; visibility: hidden`. Do not use `@starting-style` (it is beyond the browser floor). While any handle is dragging there are no transitions on the band.
3. **Pressed and on states.** Entering one: `background-color`, `box-shadow` and `translate` over `--fl-duration-press`. Leaving one: over `--fl-duration-quick`. Put the faster transition on the state selector and the slower one on the base, so each direction gets its own duration.
4. **Hover.** `background-color` over `--fl-duration`, as today.
5. **Copy feedback.** The link icon to check swap cross-fades over `--fl-duration-quick`.
6. **Menus.** Only if the installed `Menu.Popup` exposes open and close state attributes (check the 10.4.0 types and docs; report what you found): open with `opacity 0 → 1` and `translate: 0 2px → 0` over `--fl-duration`; close over 70 ms. If it does not, leave menus as they are.
7. **Zoom and pan stay instant.**

---

## 6. Fixes

1. **Range band right edge.** The band shows rounded corners at its right end, while its left end is cleanly covered by the In handle. Both ends of the band must be square and meet their handle exactly, whether that handle is set or idle. Find the source (band, chapter clip, or track radius) and fix it there. Screenshot both ends at 400% browser zoom, with the range set and with only In set.
2. **Narrow row two alignment.** Fixed by 2.2.

---

## 7. Verify (real screenshots, opened and looked at)

- Studio wide at 1440, 1100, 1040, 900 and 800 px: no range; range set and looping; a menu open; Zoom at 200%.
- Studio narrow at 430, 390, 360 and 320 px: no range; range set.
- The link button: resting, hovered, focused, and right after a copy (check icon showing).
- Close-ups at 400% browser zoom of the range band's ends, a handle (idle, set, dragging), a marker pin (normal, selected), Play, Loop on, and the timecode field.
- With bright footage behind the dock (the demo's white frame) and dark footage.
- `forced-colors` and `prefers-contrast: more` emulated: no gradients, everything still visible.
- `prefers-reduced-motion` emulated: no transitions.
- Keyboard: `S` copies the link (check the clipboard text), `Shift+G` copies the image, the help dialog lists both, and focus rings show on every restyled control.
- Contrast script passes.
- Viewer tier: the network panel shows no Studio chunk.
- Firefox and WebKit: one screenshot each of the wide dock with a range set.

## 8. Docs, deploy, report

- `FEATURES.md`: the link button and `S`; `Shift+G`; the narrow row's order and its fold rules; Markers on narrow; In/Out removed on narrow; the tactile and motion rules in one row each under Principles.
- `NOTES.md`: the token changes, any nudged values, what you checked for key collisions and for `Menu.Popup` state attributes, and an Unverified list.
- Deploy to production. Report the URL, the screenshots and the list of anything that differs from this file, with the reason.
