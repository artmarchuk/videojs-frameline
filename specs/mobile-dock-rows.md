# Narrow dock: row one is the instrument, row two the toolbar

Read first: `specs/dock-polish-2.md` (raised keys and flat buttons), the "Dock polish" section of `NOTES.md`, this file.
Work on a new branch, `mobile-dock-rows`, from `main`, and deploy from it; the author merges after the report. Commit messages are written for public readers.

## Why

On phones the two rows of the narrow dock have no rule. Loop is the only raised tile in a row of flat buttons. Link is flat in row two, although on the wide dock it is joined to the timecode. In landscape, row one leaves its right third empty and row two spreads eight icons about 80 px apart. The fix uses the existing hierarchy: **row one holds the raised keys (the instrument) as far as width allows; row two holds the flat toolbar.**

## 1. Wide narrow dock (narrow arrangement, player 500 px or wider)

This is a phone in landscape (a player about 692 × 375 px), or a narrow window on a touch device.

```
[ 00:00:45:17 | link ]      [ |< <| ] [ Play ] [ |> >| ]      [ Loop ]
  Markers   Capture   Guides   Zoom   Settings   Fullscreen
```

- **Row one**, as a three-column grid (`1fr auto 1fr`):
  - Start: the timecode field with the Link button joined to it, exactly as on the wide dock (`.pro-timecode-pair`, same radius, same 2 px gap).
  - Centre: the full transport, unchanged.
  - End: Loop, a raised key, aligned to the end edge. It mirrors the timecode at the start.
- **Row two**: six flat buttons in equal cells, in this order: Markers, Capture, Guides, Zoom, Settings, Fullscreen. Same cell rules as today (44 px minimum, centred in each cell).
- **Less height**: for this arrangement only, the dock's vertical padding goes from about 12 px to 8 px top and bottom, and the gap between row one and row two from about 10 px to 6 px. Keep every target at 44 × 44. Report the dock's total height before and after at 692 × 375.
- Check that row one fits from 500 px up to the point where the wide arrangement takes over (740 px). If it doesn't fit at 500, raise this threshold to the smallest width that fits and report the number. Don't shrink targets to make it fit.

## 2. Narrow dock under 500 px (phone in portrait)

```
[ 00:00:45:17 ]  [ |< <| ] [ Play ] [ |> >| ]
 Markers  Loop  Capture  Link  Guides  (Zoom)  Settings  Fullscreen
```

- **Row one**: unchanged (timecode and full transport, as on `main` now).
- **Row two**: unchanged order and fold rules (Zoom hidden under 382 px, Link moves into Settings under 340 px). One change: **Loop is flat here**, like its neighbours. At rest it has no fill; while looping it shows the pressed treatment, like every other flat toggle (an open menu, Zoom above Fit). Its `aria-pressed` is unchanged.

## 3. Unchanged

- The wide dock (740 px and up).
- Shortcuts, accessible names, tooltips, focus rings, announcements.
- Forced colours and `prefers-contrast: more`: the same cues as today for Loop on and off, in both positions.
- Tab order follows the visual order, row one first. Check it in both arrangements.

## Verify (real screenshots, opened and looked at)

- Landscape: 692 × 375 player (touch emulated), no range; range set and looping; a menu open from row two.
- The new threshold: at the threshold and at 740 px.
- Portrait: 390, 343 and 320 px, Loop off and on.
- Close-ups at 400%: the landscape row one end to end; portrait row two with Loop on and off.
- Forced colours and `prefers-contrast: more`: Loop on and off in both arrangements.
- Typecheck, unit tests, build, the browser checks (update `scripts/browser-checks/dock-polish.js` for the new positions).
- `FEATURES.md` (the narrow dock's two arrangements) and `NOTES.md` (threshold, heights before and after, Unverified).
- Deploy from `mobile-dock-rows`. Report the URL and anything that differs from this file, with the reason.
