# Theme wrap-up: the three engines, the untested states, the docs

The last step of the theme refresh (Themes A, A.1, A.2, B, C, C.6). No new look. It closes the gaps the five reports left as Unverified, so the README's browser-support claim is true again for the current theme, and lists what the refresh leaves for the backlog in the report.

Read first: `NOTES.md` (the Theme A to C.6 sections, especially every "Unverified" list), the README sections "The look", "Tokens" and "Browser support", this file.

## W.0 Branch, deploy, rules

- Branch `theme-wrap` from current `main`. Commit this spec first.
- Fixes only for regressions this pass finds, and each one is the smallest CSS change that fixes it. No new look, no new tokens unless a fix needs one. Anything that is not a regression goes in the report under "Backlog proposals", not into code.
- Checks run against the local production build of `main`, then against the live site https://frameline.artmarchuk.me for the screenshots in W.2.
- If there are no code changes: merge nothing, deploy nothing; commit the docs to `main` directly. If there are code changes: preview deploy, report, and stop for review (no production deploy, no merge).

## W.1 Every check in three engines

Run in Playwright's Chromium, Firefox and WebKit, at the widths each script already uses:

- every script in `scripts/browser-checks/` (including `axe-audit.js`, `reduced-motion.js`, `viewer-gate.js`),
- `prefers-contrast: more` and `forced-colors: active` for `dock-polish`, `phone-transport`, `handle-focus-ring`, `guides-menu-focus` and `range-playback` (forced colours: Chromium only if the others cannot emulate it; say so).

Report a table: script × engine × mode, pass or fail, and for each failure whether it also fails on the commit before Theme A (`f42957d`): a failure that predates the refresh is reported, not fixed here.

## W.2 Screenshots in Firefox and WebKit

On the live site root, 2x, Firefox and WebKit, each next to Chromium:

1. The full dock at 1280, with a range set and Loop on.
2. Close crops: the keybed (rest, a hovered tile, a focused tile), Loop on next to Zoom at 200%, the timecode at `00:00:02:04`.
3. A Studio menu open over the picture, and one on the narrow dock (390) over the dock.
4. The narrow dock at 390 and 324.

Open each one. Report every visible difference between engines (seams, edge lines, the light's glow, the timecode's width, the menu edge). A difference is a regression only if something is missing, clipped, overlapping or unreadable.

## W.3 The states nobody has seen

- **Captions on.** The demo has no captions. In a browser check only (not on the page, not in `media.ts`), add a one-cue WebVTT `<track kind="captions">` to the video and screenshot captions off and on in the dock (wide, and the narrow dock if captions show there). Confirm the light and no fill.
- **A transport with features off.** With the configurator's flags (or the host props the configurator uses), turn off shot navigation, then frame stepping, then both. Screenshot the keybed each time: the housing must still have rounded outer corners and seams only between keys that are there. Same at the narrow dock.
- **A disabled tile**, if any transport key can be disabled (for example before the media has loaded, or at the first or last frame). Screenshot it, or say no key can be disabled.
- **A wider font.** The narrow dock has a 2px margin at the 324px fold, and Windows fonts cannot be run here. Simulate a wider face: in a browser check, set the skin's `--media-font-family` to `Verdana, sans-serif` and measure row one at 324, 330 and 390. Report the widths and whether anything overflows. Do not fix the layout in this step; report the measurement.

## W.4 Docs

- README, "Tokens": the `--fl-accent` row lists where the accent appears, and it must include the indicator light (`--fl-led`), as "The look" does.
- README, "Browser support": update the engine table from W.1 and say which theme states were checked in which engine. Keep it to what was run.
- `NOTES.md`: a "Theme refresh: wrap-up" section with the W.1 table, the W.2 differences, the W.3 results, and one consolidated list of what is still unverified after the refresh (one list, replacing the need to read five). Mark the earlier per-step Unverified items as resolved where this pass resolved them.
- Backlog proposals, in the report (Artem adds them to the project backlog), each with one line:
  - narrow dock: fold the cut pair at 330px instead of 324px if a wider font overflows (W.3's measurement decides);
  - Markers menu: long names and times are cut on a narrow player;
  - Guides menu: cut at its bottom edge on a 760px player (seen during the landing work);
  - landing page: its `--range` token still holds the old range blue;
  - Viewer overlay: a toggle that is on still uses the lighter `--fl-on` fill; the light is dock-only by decision, revisit if the Viewer is restyled.

## W.5 Report

The W.1 table, the W.2 differences, the W.3 screenshots and measurements, any fix with its before and after, the consolidated Unverified list, and whether anything was deployed.

## W.6 Close-out after review

Same branch. Then merge and deploy.

1. **Accept the fix** (Play alone in the housing under 324px).
2. **dock-polish under forced colours:** the three assertions that assume default colours are wrong for that mode. Make them mode-aware (in forced colours, assert the boundary and the Highlight state, not the default fills). Test code only. The suite must be green in all three engines afterwards, except the known check limits (phone-transport touch drags outside Chromium, WebKit clipboard, the Firefox rendition note, the intermittent WebKit zoom grab), which stay listed.
3. **Hover on a disabled key:** a key with `aria-disabled="true"` takes no hover fill. One rule in the keybed's hover selector.
4. **Guides over captions is intended:** safe areas are drawn over the captions so a creator can check that captions sit inside title safe. Drop it from the Backlog proposals and add one sentence to the Guides row of `FEATURES.md` saying so.
5. **The `≈` marker in Firefox:** report whether the live site shows `≈` in Playwright's Firefox (that is, whether `requestVideoFrameCallback` is present there). If it does, every Firefox user sees the marker, and the Verdana overflow becomes more likely: say so, and put "verify on Windows Firefox" at the top of that item in the report's Backlog proposals.

Run typecheck, tests, build, contrast and the full W.1 suite. Then merge `theme-wrap` into `main`, and deploy production from a clean checkout of `origin/main`, by the deploy guard. Check the live site (the keybed at 320 with frame stepping off) and report. No tag.
