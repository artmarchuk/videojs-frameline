# Icon trial, round two: our step, marker and capture icons; correct cut icons; "More" menu

Read first: `specs/icons-phosphor-trial.md`, the icon-trial section of `NOTES.md`, this file.
Continue on the `icons-phosphor-trial` branch. **Preview deploy only; no production deploy, no merge.** Commit messages are written for public readers.

## 1. The step and cut convention

Frameline follows the editing-app convention (After Effects, Premiere):

| Action | Shape | Rule |
| --- | --- | --- |
| Frame step back / forward | `◀|` / `|▶` | The arrow points **away** from the bar |
| Previous / next cut | `|◀` / `▶|` | The arrow points **into** the bar |

The branch currently has double carets (◀◀ ▶▶) on the cut buttons and Phosphor's skip icons on the step buttons. That is wrong both ways: double triangles mean rewind and fast-forward (or the J/L shuttle), and `|◀` `▶|` are the cut symbols.

- `PreviousCutIcon`, `NextCutIcon`: Phosphor `skip-back` and `skip-forward`, Fill weight. Check the names in the pinned version.
- `StepBackIcon`, `StepForwardIcon`: our own icons from `design/icons/` (section 2).
- Remove the double carets entirely.

## 2. Our own icons from `design/icons/`

The author exported these, each at 24, 18 and 20 px:

| Component | Files |
| --- | --- |
| `StepBackIcon` | `fl-step-back-24.svg`, `-18.svg`, `-20.svg` |
| `StepForwardIcon` | `fl-step-forward-24.svg`, `-18.svg`, `-20.svg` |
| `BookmarkIcon` (the Markers button) | `fl-marker-24.svg`, `-18.svg`, `-20.svg` |
| `GrabFrameIcon` (the Capture button) | `fl-capture-24.svg`, `-18.svg`, `-20.svg` |

- **Use them as drawn.** Copy their path data into the components. Don't redraw, simplify or re-optimise the paths beyond removing what is not drawing.
- **Colour:** the files use `fill="#F2F2F2"`. Replace every fill colour with `currentColor`. Keep any `fill-rule` and `clip-rule` attributes exactly, because cut-outs (the camera's lens ring) depend on them. Check that the lens ring stays open after the change.
- **Pick the size that was drawn for each place.** Each size was tuned by hand at that size, so use the 18 px drawing where the icon renders at 18 px (the wide dock), and the 20 px drawing where it renders at 20 px (the narrow dock). For any other size, use the 24 px drawing scaled. Each drawing keeps its own `viewBox` (`0 0 18 18`, `0 0 20 20`, `0 0 24 24`). Choose the mechanism (a size prop, a context, or CSS that shows one of the drawings); the icon must not shift layout or flash when the dock switches between wide and narrow. Report which mechanism you used.
- Keep component names and props unchanged.
- Rename `BookmarkIcon` to `MarkerIcon` only if the rename is trivial and fully covered by the typecheck; otherwise leave the name.
- Leave the SVG files in `design/icons/` as the source. Don't ship them in the package.

## 3. Settings becomes "More"

- Icon: Phosphor **"Dots Three Outline"**, Fill weight (`dots-three-outline` as far as I know; check the name in the pinned version, and take the horizontal one).
- **Name:** the button's accessible name and its tooltip change from "Settings" to "More". Update the strings in `strings.ts`, the help dialog if it names the button, `FEATURES.md` and the README where they call it the Settings menu or button. Prop and component names in the code stay as they are.
- The menu's contents and behaviour don't change.

## 4. Unchanged on this branch

- Guides: the current icon (solid outer frame with a dashed rectangle inside).
- Link: our own icon.
- Fullscreen enter and exit: Phosphor `corners-out` and `corners-in`.
- Volume: Phosphor.
- `THIRD_PARTY_NOTICES.md`: update the list of Phosphor icons used (add `skip-back`, `skip-forward`, `dots-three-outline`; remove anything no longer used).

## Verify and report

- Screenshots, opened and looked at:
  - Wide dock at 1280 px: no range; range set and looping; the More menu open.
  - Narrow dock at 692 × 375 and 390 px: no range; range set.
  - Close-ups at 400%: the transport row `|◀ ◀| ▶ |▶ ▶|` on the wide dock (18 px drawings) and on the narrow dock (20 px drawings); Marker and Capture at both sizes; the More button.
  - Forced colours and `prefers-contrast: more`: one wide shot each.
- Confirm in the DOM that the 18 px drawing is used on the wide dock and the 20 px drawing on the narrow dock.
- Typecheck, unit tests, build, the contrast script, the browser checks (update any check that looks for the name "Settings").
- Viewer bundle size before and after (gzip).
- Update `NOTES.md` (icon sources and names, the size mechanism) and `FEATURES.md`.
- Report the preview URL and anything that differs from this file, with the reason.
