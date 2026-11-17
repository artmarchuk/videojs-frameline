# Theme C: the timecode as a display

The last theme step. On the reference devices the display is the calmest and most legible thing on the body: large, light numerals and nothing else. The Frameline timecode already sits in a recessed well (Theme A, A.1). This step makes the digits read like a display: larger, lighter in weight, with the leading zeros stepped back so the digits that change carry the reading.

Read first: `specs/PROJECT-OVERVIEW.md`, `NOTES.md` (Theme A to B sections), `specs/theme-a1-review-fixes.md` (A1.5, the display kind), this file. Code: `TimecodeField` in `src/pro/studio/index.tsx`, the Timecode section of `src/pro/studio/studio.css`, `--fl-text-timecode` in `src/styles/tokens.css`.

## C.0 Branch, deploy, rules

- Branch `theme-c` from current `main` (Themes A and B are merged; check with `git log`). Commit this spec first. Leave untracked files alone.
- CSS, tokens and the one markup change in C.3. No behaviour, no new strings, no change to what is announced or to the accessible name.
- No production deploy. Vercel preview, push the branch, no merge, no tag.
- Screenshots on the **site root** (`index.html`), not the workbench.

## C.1 Out of scope

- The Viewer's time display (overlay) and the "of 00:00:56:02" duration text beside the field: they keep their look.
- The type family: the system UI stack stays (decided Nov 17). No webfont, no monospace.
- The burned-in timecode in the demo media.
- Any change to timecode formatting, drop-frame, the seconds toggle or the approximate-clock marker logic.

## C.2 Larger, lighter digits

| Token | Now | New |
| --- | --- | --- |
| `--fl-text-timecode` | `calc(var(--media-spacing) * 4.25)` (17px) | `calc(var(--media-spacing) * 5.5)` (22px) |
| `--fl-timecode-weight` (new) | 500 (hard-coded) | 400 |

- `font-variant-numeric: tabular-nums` stays, so digits do not shift.
- Letter spacing: `0.01em`. Check the colons do not crowd the digits at 22px; if they do, say so with a crop. Do not add spaces to the string.
- **Field size.** The field keeps the dock row's height (`--fl-control-size`). Re-measure its width for the widest value it can show at the new size, including the `≈` marker and drop-frame `;`. Keep the comment that records the measurement, as the narrow rule does today. The link cell and the rest of row one must not move by more than the width change; nothing may wrap or clip at 1280, 1100, 1040 and 900.
- **Smaller containers.** The `< 900px` rule (15px today) becomes 18px. The narrow dock (14px today) goes to 16px **only if** row one still fits at 390 and at 320 without truncating anything; otherwise it stays 14px. Report which, with the measurement.
- Weight trial, screenshots only: one extra shot of the wide dock with `--fl-timecode-weight: 300`. On Windows, Segoe UI Variable has a 300; check the stack's fallback renders a real light weight and not a synthesised one, or say you could not check.

## C.3 Leading zeros step back

In `00:00:02:04` the reader needs `2:04`. The leading run of zeros and separators is drawn in a quieter colour; the rest in the text colour.

- **Rule.** In timecode mode, the dimmed part is the leading run of `0`, `:` and `;` characters up to the first non-zero digit, but never the last two characters (the frames): `00:00:00:00` dims `00:00:00:` and keeps `00`; `00:00:02:04` dims `00:00:0`; `01:00:00:00` dims nothing. In seconds mode nothing is dimmed.
- **Markup.** Render the value as two adjacent `span`s, `.pro-timecode-lead` (the dimmed run, omitted when empty) and the rest, inside the existing value span. A pure helper computes the split; add unit tests for the four examples above, drop-frame (`00:00:00;12`), a three-digit hour and seconds mode.
- **No whitespace** between the spans, so the visible text and the accessible name stay exactly the string they are today. Check the accessible name in the browser before and after, and report both.
- Colour: new token `--fl-timecode-lead: #7a7a7a`, 4.56:1 on the well (`#0c0c0c`): still readable text. Under `prefers-contrast: more` it is `--fl-text-dim` (12.18:1 there). In forced colours it is `CanvasText`, the same as the digits: the dimming goes away.
- The `≈` marker keeps its own dim colour and sits before the lead span.
- No transition on the colour: the split changes with the frame, and nothing that shows time animates (decided Nov 16).
- Performance: the field re-renders when the frame changes and at no other time (as today). The helper is a string scan, no regex built per render.

## C.4 Contrast, docs

- `scripts/contrast.mjs`: the lead colour on the well in both columns (minimum 4.5), and the 300-weight note if the trial is kept as an option.
- NOTES: a Theme C section with the final sizes and widths, the narrow-dock decision, the split rule, the accessible names, Unverified.
- README token table: `--fl-text-timecode`, `--fl-timecode-weight`, `--fl-timecode-lead`.
- `FEATURES.md`: describe the dimmed leading zeros in the timecode row.

## C.5 Checks, screenshots, report

Run typecheck, tests (including the new split tests), build, `node scripts/contrast.mjs`, and the browser checks `dock-polish`, `phone-transport`, `range-playback`.

Screenshots at 2x on the site root, each paired with `main`:

1. Close crop of the timecode and link at `00:00:00:00`, `00:00:02:04`, `00:00:56:01`, and in seconds mode.
2. The full dock at 1280 and at 900.
3. The narrow dock at 390 and 320.
4. The `≈` marker, if the demo can show it (say how you triggered it, or that you could not).
5. `prefers-contrast: more` and `forced-colors`: the timecode at `00:00:02:04`.
6. The weight trial (300) next to the shipped 400.

Report: the preview URL, the pairs, the final sizes and widths, the narrow-dock decision, the accessible name before and after, the test and contrast output, and what you could not verify. Describe what the screenshots show.
