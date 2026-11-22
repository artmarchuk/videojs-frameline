# Trial: Phosphor Fill icons as a temporary set

Read first: `specs/PROJECT-OVERVIEW.md`, `NOTES.md`, this file.

**This is an evaluation, not a release.** Work on a new branch, `icons-phosphor-trial`, from `main`. **Do not deploy to production and do not merge.** Deploy a preview only (a Vercel preview deployment, not `--prod`). If the deploy script can't make a preview, build and screenshot locally and say so. Commit messages are written for public readers.

## Why

The current icons are generic 1.5 px outline icons. A hand-drawn set is in the Backlog. Until then, try Phosphor Icons in the **Fill** weight: solid shapes with soft corners, close to the direction of the new set. Phosphor is MIT licensed, which is compatible with this Apache 2.0 repo, provided its notice ships with the code.

## 1. Bring the icons in

- **No runtime dependency.** Copy the SVG path data of the icons used into our own icon components. You may add `@phosphor-icons/core` as a **devDependency, pinned exactly**, to read the source SVGs. Record the package name, version and every icon name used in `NOTES.md`.
- Add a fill-based frame next to `Icon` in `src/video/icons/icon.tsx`, for example `FillIcon`: Phosphor's `viewBox` (check it in the package; it is 256 × 256 as far as I know), `fill="currentColor"`, no stroke, `aria-hidden="true"`, `focusable="false"`, and no fixed size. The control still sets the size, as today.
- Keep every component's name and props, so nothing else in the code changes. Only the drawing inside changes.

## 2. Mapping

Check that every Phosphor name below exists in the pinned version before using it. If one doesn't, pick the closest and report it. Do not invent names.

| Our component | Phosphor icon (Fill), candidates in order |
| --- | --- |
| `PlayIcon`, `PauseIcon` | `play`, `pause` |
| `PreviousCutIcon`, `NextCutIcon` | `skip-back`, `skip-forward` (bar plus arrow pointing into it: our cut convention) |
| `StepBackIcon`, `StepForwardIcon` | **Keep the current icons.** Phosphor has no frame-step glyph (arrow pointing away from a bar). Report how they look next to the solid ones |
| `LoopIcon` | `repeat` |
| `GrabFrameIcon` | `camera` |
| `BookmarkIcon` (Markers) | `bookmark-simple` |
| `LinkIcon` | `link` |
| The check after "Link copied" | `check-fat`, else `check` in the Bold weight |
| `GuidesIcon` | `frame-corners` |
| Fullscreen enter, exit | `corners-out`, `corners-in` |
| Captions on, off | `subtitles`, `subtitles-slash` |
| `SettingsIcon` | `sliders-horizontal` |
| Volume high, low, muted | `speaker-high`, `speaker-low`, `speaker-x` |
| PiP enter, exit | `picture-in-picture` (both, if there is no exit variant) |
| Speed, quality, audio track | `gauge`, `high-definition`, `waveform` |
| Keyboard, error, replay | `keyboard`, `warning-circle`, `arrow-counter-clockwise` |
| Chevron, close | `caret-down` / `caret-right` as needed, `x` |
| Spinner | Keep the current one |

- **Small glyphs (chevron, close, check):** if the Fill weight turns them into a filled tile or a blob, use the **Bold** weight for those three and say so.
- **Guides against Fullscreen:** `frame-corners` and `corners-out` may look alike. Put them side by side at 18 px in the report. If they can't be told apart, try `selection` for Guides and report both.

## 3. Licence notice

- Add `THIRD_PARTY_NOTICES.md` at the repo root with Phosphor's copyright line and the full MIT licence text, copied from the package's own licence file, naming which icons are used.
- Add one line to the README under a "Credits" heading: icons from Phosphor Icons (MIT), with the link.
- Do not change `LICENSE`.

## 4. Look

- Same sizes as today (`--fl-icon-size`, 18 px on the wide dock, 20 px on the narrow dock). Phosphor draws inside padding on its grid, so its glyphs may look smaller than the current ones. Don't rescale per icon. Report the visible glyph size against the current icons. If every icon reads clearly smaller, propose one global size change, but don't apply it.
- Nothing else changes: colours, the raised and flat treatment, pressed states, focus rings.

## Verify and report

- Screenshots, opened and looked at, **before (main) and after (this branch) in the same states**:
  - Wide dock at 1280 px: no range; range set and looping; the Settings menu open; the Capture menu open.
  - Narrow dock at 692 × 375 (landscape) and 390 px (portrait).
  - The Viewer at 1280 and 390 px.
  - Close-ups at 400%: the transport row, Loop on and off, and Guides beside Fullscreen.
  - Forced colours and `prefers-contrast: more`: one wide shot each.
- Typecheck, unit tests, build, the contrast script, the browser checks.
- Viewer bundle size before and after (gzip).
- Report: the preview URL, the Phosphor version and the icon names used, any substitutions, the step-icon mismatch, the glyph-size comparison, and anything that differs from this file. Update `NOTES.md` on the branch only.
