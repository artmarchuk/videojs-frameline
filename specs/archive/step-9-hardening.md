# Step 9: Hardening and audit

The last build step. No new features. It makes Frameline hold up in other browsers, under accessibility preferences, and in an automated audit. Accessibility and execution are 10 of the 25 points.

Read first: `specs/PROJECT-OVERVIEW.md`, `FEATURES.md`, the step 8 section of `NOTES.md`, this file.

Tag: `step-9-hardening`. Push to origin with tags at the end.

---

## 9.0 Terminology

The author renamed two tags in the feature list. Use the new names everywhere: `specs/PROJECT-OVERVIEW.md`, `FEATURES.md`, README and NOTES (current sections).

| Old tag | New tag |
|---|---|
| [Contest] | [Scope] |
| [Later] | [Backlog] |

Leave the old step files as history.

## 9.1 `prefers-contrast: more`

Under `@media (prefers-contrast: more)`, raise contrast without changing the layout:

- **Text:** secondary text (text-dim) reaches at least 7:1 on its background.
- **Borders and lines:** they reach at least 3:1, menu separators included.
- **Playhead:** its dark outline grows from 1 to 2 px.
- **Range handles:** idle handles reach at least 4.5:1 against the track.
- **Guides:** lines go from their current weight to 1.5×. The dark outline stays.
- **Focus ring:** 3 px.
- **Scrim:** the Viewer scrim gets stronger under the controls.
- **Page:** the configurator page does the same in both themes.

Extend `scripts/contrast.mjs` with a "more" column and make it pass. Screenshots: Studio and Viewer with the preference emulated.

## 9.2 `forced-colors` (Windows High Contrast)

Under `@media (forced-colors: active)`, make sure nothing important disappears when the system replaces colours:

- **Buttons and menu items:** visible boundaries (use `ButtonText` and `ButtonFace`, `Highlight` for selected and checked).
- **Playhead, range band, handles and markers:** drawn with system colours; the range band must still be distinguishable from the track. Use `Highlight`, or a border if fills are dropped.
- **Icons:** SVG icons use `currentColor` so they follow the system colour.
- **Focus ring:** it stays visible (`Highlight`, or `outline`, which forced colours keeps).
- **Guides:** they stay visible over video, using `CanvasText` with a `Canvas` outline.
- **Unchanged:** the video picture itself is not affected.

Emulate with Playwright (`forcedColors: 'active'`). Screenshots of Studio with a range, a menu open and guides on, and of the Viewer.

## 9.3 Reduced motion

Confirm with emulation (`reducedMotion: 'reduce'`) that every transition and animation in the skin and on the page is instant or removed:

- the controls fading;
- menus opening;
- the volume slide-out;
- the toasts;
- the scroll behaviour on the page.

Fix anything that still moves, and list what you checked.

## 9.4 Other browsers

Install Playwright's Firefox and WebKit if they are missing, and run every existing check in all three engines:

- the Viewer gate checks;
- every script in `scripts/browser-checks/`;
- the page checks from step 8.

For each engine, report what passed, what failed, and what you fixed. In particular:

- **Frame clock:** which source each engine uses (`requestVideoFrameCallback` or the fallback), and whether frame stepping still lands on the right frame (compare the timecode after 10 steps).
- **Zoom:** whether `image-rendering: pixelated` works on video, and whether guides counter-scale correctly.
- **Grab frame:** check it in each engine. Clipboard image copy may be unsupported in Firefox; if so, hide or disable "Copy frame image" there with a clear hint instead of failing silently.
- **Rendition:** WebKit plays HLS natively, so rendition notes and the cap lift may do nothing there. Make sure nothing breaks or shows wrong information.
- **Menus and focus order:** they behave the same in every engine.

WebKit in Playwright is close to Safari but not identical, and Safari 16.4 cannot be emulated. Say so in the README's browser support table.

## 9.5 Automated accessibility audit

- Add `@axe-core/playwright` as a dev dependency.
- Scan the configurator page in both themes, Studio with the Guides menu open, the Zoom menu open, the help dialog open, and the Viewer.
- **Target:** zero serious or critical violations. Fix them. List moderate and minor ones, and fix them where cheap.
- If the challenge's own audit prompt is in the repo (or in `specs/`), run it as well and report.

## 9.6 Carry-overs

- **Error dialog:** when Retry fails on a broken source, the error dialog must show again. Today it may not. Test with a bad URL.
- **Two players on one page:** they must not share state, filters, focus handling, hotkeys or guide storage in a wrong way. Add a test page `two-players.html` (not linked from the main page) and a browser check. Hotkeys go only to the player that has focus.
- **Language:** add a line to the README noting that the skin's own strings are English only.
- **Real fullscreen:** keep the hand-test checklist below in the report. Code paths stay as in step 6d.

## 9.7 Documentation

- **`FEATURES.md`:**
  - mark `prefers-contrast`, `forced-colors` and reduced motion as done, with the step;
  - add a browser support section built from 9.4;
  - use the new [Scope] / [Backlog] terms.
- **README:** a browser support table (Chrome, Firefox, WebKit/Safari, with known differences), plus the accessibility features in one short list.

---

## Verification

- Typecheck, unit tests, build and the contrast script pass.
- All browser checks pass in Chromium. Firefox and WebKit failures are fixed, or listed with a reason.
- axe: zero serious or critical violations.
- Re-run the Viewer gate checks on the live site, `https://frameline.artmarchuk.me`. The Viewer still requests no pro chunk.
- Screenshots in `design/screenshots/step-9/`, opened and looked at:
  - prefers-contrast: more, for Studio and Viewer;
  - forced-colors, for Studio and Viewer;
  - one Studio shot each in Firefox and WebKit.
- One commit per item (9.0–9.7), with the attribution lines from your session instructions. Deploy, tag `step-9-hardening`, and push with tags.

## Report

1. URL and screenshot folder.
2. One line per item, and any differences from this file.
3. The browser table: Chromium / Firefox / WebKit × each check, with pass, fail or fixed.
4. axe results: counts by severity before and after.
5. Bundle sizes, Viewer path and Studio.
6. **Hand-test checklist for the author** (things no headless browser can do), short and in order:
   - real fullscreen in Safari and Chrome (F, Escape, dock included, focus after exit);
   - iPhone Safari: play, seek, fullscreen, range drag;
   - VoiceOver: Tab through Studio, change the range with arrows, open Guides;
   - Windows High Contrast, if a Windows machine is available.
