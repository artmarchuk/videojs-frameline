# Dock polish, follow-up: key hierarchy, range motion, narrow fit, two checks

Read first: `specs/dock-polish.md`, the "Dock polish" section of `NOTES.md`, this file.
Work on the `dock-polish` branch and deploy from it; the author merges to main after reviewing your report. Commit messages are written for public readers, as before.

---

## 1. Raised keys for the instrument, flat buttons for the toolbar

The dock now reads as about 13 equal tiles. Give it a hierarchy: the controls you press while checking timing are physical keys; everything else is a toolbar.

**Raised (keep today's treatment):** the transport groups (previous cut, step back, step forward, next cut), Play, Loop, and the Link button joined to the timecode field. The timecode well stays recessed.

**Flat at rest:** Markers, Capture, Guides and Zoom (each menu button with its badge and chevron), Reset range (×), Captions, Settings, Mute and Fullscreen. On the narrow dock's second row, everything except Loop is flat.

| State of a flat button | Look |
| --- | --- |
| Rest | No fill, no gradient, no highlight, no shadow. Icon and text in `--fl-text`. |
| Hover | Flat `--fl-surface-2` fill, `--fl-radius`, no bevel. Same duration as other hovers. |
| Pressed / on (open menu `aria-expanded="true"`, Zoom not at Fit, `:active`) | The same pressed treatment as the keys: `--fl-on` fill, darker top, inner shadow. Entering and leaving use the same durations as the keys. |
| Focus | Unchanged focus ring. |

- Keep every target at least 24 px (44 px on touch and narrow). Only the drawing changes; sizes and positions stay as they are.
- The volume slider is unchanged.
- In forced colours and `prefers-contrast: more`, nothing changes from today.

## 2. Remove the white bar under Loop

- Remove the leftover indicator (`.pro-tool[data-pressed]::after` in `studio.css`, or wherever the bar comes from). Loop's "on" state is the pressed treatment plus `aria-pressed="true"`, the same as the other pressed states.
- First check whether that bar is what shows Loop's state under `forced-colors: active`. If it is, give the pressed state there a system-colour cue instead (for example `Highlight` for the border or the icon), and say what you used. Loop on and off must still be told apart in forced colours.

## 3. Range appear and disappear: make it felt

The transition exists, but at 90 ms in and 70 ms out it does not register, and it never plays when the range is first made by dragging a handle (the drag rule switches all band transitions off).

- New tokens: `--fl-duration-range-in: 160ms`, `--fl-duration-range-out: 120ms`, both `0ms` under `prefers-reduced-motion: reduce`.
- Appear: `opacity 0 → 1` and `transform: scaleY(0.4) → 1` from the centre line, over `--fl-duration-range-in`, with `--fl-ease`. Disappear: the reverse over `--fl-duration-range-out`, then `visibility: hidden`.
- Remove the blanket `transition: none` on the band while a handle is dragged. The band's start and end are not in any transition anyway, so dragging stays 1:1; the appear fade must now also play when the first point is set by a drag.
- A handle changing between idle and set (colour, shadow) uses `--fl-duration-range-in` too, so the band and its handle arrive together.
- Still never in a transition: `left`, `right`, `width`, or any position of the band, the handles or the playhead.
- Verify with a recording (a short frame sequence or several screenshots 40 ms apart is enough) for each way a range appears: `I` key, `O` key, dragging an idle handle, `apiRef.setRange`. Also verify clearing by `Shift+I` then `Shift+O`, and by Reset range.

## 4. Narrow players under 294 px

The second row (six 44 px cells) overflows under 294 px.

- Player under 300 px: the narrow dock's side padding goes from 15 px to 12 px. Six cells then fit down to 288 px.
- Player under 288 px: the second row's cells may shrink to 40 px (still above the 24 px WCAG minimum), so six cells fit down to 264 px.
- Verify at 300, 288, 280 and 264 px: no overflow, no wrap, nothing past the edge.

## 5. Check: "Link copied" is still announced

You dropped the visual toast while the Link button is on screen. Confirm with the accessibility tree or a live-region log that the status announcer still says "Link copied, " plus the timecode, in both cases: button on screen, and folded into Settings. Do the same for "Frame image copied" after `Shift+G`. If an announcement is missing, restore it (announcement only, no visual toast).

## 6. Time-boxed: the intermittent "play from outside the range" result

`scripts/browser-checks/range-playback.js` sometimes finds the head at about 12.4 s, 800 ms after pressing Play from 40 s with a 10–14 s range, where 10–12 s is expected. Starting at In, the head should be near 10.8 s. So in those runs playback started about 1.5 s past In, or the start at In was undone by an earlier seek.

Spend at most 45 minutes on it, after sections 1–5 are deployed:

1. Decide whether a user can see it. Do it by hand in the browser, the way a person would: set a 10–14 s range, click the ruler at 40 s, press Play, and note where playback starts. Repeat 20 times, mixing clicks, `Space` and the Play button, sometimes right after a loop has just happened. Log the start time of each run.
2. If people can see it, find the race (the check suggests the engine's own loop seek against the host's seek) and fix it so that play from outside always starts on the In frame. Add a unit test for the order of events that caused it.
3. If only the check's own direct `currentTime` writes cause it, fix the check so it waits for the engine's seek to settle, and say why that is a fair test.
4. If neither is settled in 45 minutes, stop. Report what you observed with the 20 logged starts, and leave the range engine as it is.

Commit this separately from sections 1–5.

---

## Verify and report

- Screenshots, opened and looked at: the wide dock at 1280, 1100 and 820 px (no range; range set and looping; a menu open; Zoom at 200%), a hovered flat button, and the narrow dock at 390, 300, 288 and 264 px.
- Close-ups at 400%: a raised key next to a flat button at rest, hovered and pressed; Loop on and off.
- Forced colours and `prefers-contrast: more` emulated: Loop on and off are distinguishable, and every flat button is still visible.
- The range-motion recordings from section 3.
- Typecheck, unit tests, build, the contrast script, and the browser checks (range-playback reported as N of M runs).
- Update `FEATURES.md` (raised keys and flat toolbar under Principles; range motion) and `NOTES.md` (what differs, Unverified).
- Deploy from `dock-polish` to production. Report the URL, what differs from this file and why, and the result of section 6.
