# Theme B: the keybed, lit "on" states, readable idle handles

The second theme step. Theme A made faces flat and lit their edges. Theme B makes the transport read as one physical part, gives modes an indicator light instead of a lighter fill, and makes the range handles findable before a range is set.

Read first: `specs/PROJECT-OVERVIEW.md`, `NOTES.md` (the Theme A, A.1 and A.2 sections), `specs/theme-a1-review-fixes.md` (A1.5, the three kinds of control), this file.

Reference: Figma frame `14:5` in file `WngORSR3hgjWjnTHqVmK3u`. The left device: keys are tiles butted together in one housing, separated by seams; state is shown by a small light, not by recolouring the key.

## B.0 Branch, deploy, rules

- Branch `theme-b` from current `main` (Theme A, A.1, A.2 are merged). Commit this spec first. Leave untracked files (`.claude/`, `design/history/`, `specs/landing-visuals.md`) alone.
- Styling only: CSS and tokens. No markup changes **except** where B.2 needs one element for the light; say exactly what you added. No behaviour, focus order, ARIA or keyboard changes.
- No production deploy. Vercel preview, push the branch, no merge, no tag.
- Take screenshots on the **site root** (`index.html`), not the workbench: the landing page's CSS has leaked into the player before.

## B.1 Out of scope

- The timecode display (Theme C).
- The Viewer tier and the overlay layout: they stay flat and must look the same as on `main`.
- Icons, type, the accent hue, the range band, menus.
- [Backlog] items in NOTES (the narrow Markers menu, the landing tokens).

## B.2 The keybed

Today the transport is three separate raised objects with gaps: `[⏮ ◀|] [ ▶ ] [|▶ ⏭]`. It becomes **one housing** with the keys butted together.

Structure (existing markup: `.pro-transport` holds `.pro-seg[data-pro-seg="back"]`, the Play button, `.pro-seg[data-pro-seg="forward"]`):

- `.pro-transport` in the dock is the housing: `gap: 1px`, a `--fl-seam` fill showing through the gaps, the outer radius `--fl-radius-group`, and the raise shadow (`--fl-raise-shadow`) on the housing only.
- Each key is a tile: `surface-2` fill (Play: `--fl-text`), its own top-edge highlight (`inset 0 1px 0 var(--fl-hi)`), no outer shadow of its own. The two segments lose their own fill, radius and shadow; their buttons become the tiles.
- Corners: the outer corners of the first and last tile take `--fl-radius-group`; every inner corner takes `2px`. Play's corners are all `2px` (it sits in the middle).
- **Do not use `overflow: hidden`** on the housing: it would clip focus rings. Round the tiles themselves.
- Hover on a tile: `surface-3` fill. Pressed: the press treatment (shade, 1px travel), as today.
- Focus ring: drawn over the neighbouring tiles, never under them (raise the focused tile's `z-index`, as the timecode pair does).
- Widths and order unchanged. Play stays wider.
- **Loop stays a separate key**, after the housing, as today: it sets a mode, it does not move the playhead.
- **Narrow dock:** row one's transport is the same housing. Under 324px, when the cut pair folds away, the housing holds step back, Play, step forward. Check the 390 and 320 widths.
- `prefers-contrast: more` and forced colours: the seams must still separate the keys. In forced colours each tile keeps its `ButtonText` border; check that two borders side by side do not look doubled, and use a single shared border if they do.

## B.3 Lit "on" states

Today a toggle that is on gets the `--fl-on` fill (`#474747`). On flat faces that reads as a lighter, raised key, the opposite of "latched in". Modes get a light instead.

**Which states:** modes only, things that stay on until you turn them off:

| Control | On when |
| --- | --- |
| Loop | `aria-pressed="true"` |
| Zoom | above Fit (`data-pressed`, zoom.tsx) |
| Captions | `data-active` |

**Not** for momentary states: a menu that is open (`aria-expanded`) and a key being held (`:active`) keep the pressed-in treatment with no light. Menu buttons with counts (Markers, Guides) keep their count badge as their indicator: no light.

**The on treatment:**

- **Shape:** the control stays pressed in: the press shadow. Fill: on a key (Loop), the key's own `surface-2`, not `--fl-on`. On a toolbar button (Zoom, Captions), `surface-2` as a latched fill. In both cases the fill must not be lighter than the same control at rest.
- **Light:** a dot, 4px, centred horizontally, `calc(var(--media-spacing) * 1)` from the bottom edge of the control, in the accent, with a glow `0 0 4px` of the accent at 60%. Draw it with a pseudo-element on the button if one is free; if both pseudo-elements are in use, add one `span` and report it. It sits below the icon and must not overlap it at compact density; check, and move the icon up by at most 1px if needed.
- **Icon:** full `--fl-text` while on (already the case).
- **Motion:** the light fades in over `--fl-duration-press` and out over `--fl-duration-quick`. Zero under reduced motion (tokens already do this).
- **New token** `--fl-led: var(--fl-accent)` and `--fl-led-glow`, so a host can change the light without changing the accent.
- **`--fl-on`:** after this step, list where it is still used. If nothing needs it, remove it and its overrides; if `prefers-contrast: more` or forced colours still need it, keep it there only.
- **Accessibility:** the state is already `aria-pressed` / `data-active`. Visually it is now shape (pressed) plus the light plus the icon at full text, never colour alone. The light is decorative; it needs 3:1 against the fill only as a nicety (computed: accent 5.13:1 on `surface-2`).
- `prefers-contrast: more`: the light stays, the pressed edge in the text colour (A.3's rule) stays. Forced colours: the light uses `Highlight`, the control keeps `Highlight` as today.
- This replaces "Toggled-on states use --fl-on, never the accent" in `tokens.css` and the overview: the accent now appears as the indicator light too. Update those sentences and the accent inventory in NOTES.

## B.4 Idle range handles you can find

With no range set, the two handles at the ends of the track are dark grey slivers (`--fl-handle-idle #787878`, 4.43:1 on the groove) and are easy to miss. The author asked how to show that a range is always available; the answer is handles that read as handles.

- `--fl-handle-idle`: `#787878` → `#a0a0a0`. Computed: 7.48:1 on the track, 6.86:1 on the dock, 2.40:1 against the band (decorative there: a set handle is the accent anyway).
- Idle handles keep the grip lines and the handle shadow (they are solid things on the track, like the set ones).
- Hover on an idle handle: `--fl-text`. Set: the accent, as today.
- `prefers-contrast: more` already has its own idle value; keep it if it is still higher, and report.
- Do **not** draw a full-length band when no range is set (decided in A.1).

## B.5 Menu edge over the dock

Since A.2, a menu opened over the dock has the dock's colour and only a `#333333` border (1.42:1) separates it. Raise the popup border, menus only, to `rgb(255 255 255 / 0.1)` and keep the shadow. Judge it on a menu opened on the **narrow** dock, where it sits over dock and not picture. If it still does not separate, report it and show the crop; do not change the menu fill.

## B.6 Contrast, docs

- `scripts/contrast.mjs`: the idle handle rows, the light on `surface-2` and on the dock, the menu border (decorative). Both columns pass.
- NOTES: a Theme B section with the final values, the `--fl-on` decision, the accent inventory, anything added to markup, Unverified. Backlog items go in the report under "Backlog proposals".
- README token table: `--fl-led`, `--fl-led-glow`, `--fl-handle-idle`, `--fl-on` if removed. The "Tactile" paragraph: the keybed and the light.
- `specs/PROJECT-OVERVIEW.md`: the sentences about on states and the accent.
- `FEATURES.md`: no feature changes; fix any sentence about how on states look.

## B.7 Checks, screenshots, report

Run typecheck, tests, build, `node scripts/contrast.mjs`, and the browser checks `dock-polish`, `phone-transport`, `handle-focus-ring`, `range-playback`, `guides-menu-focus`. If a check describes the old look (separate segments, `--fl-on` fill), update the check to the new rule and say which assertion changed.

Screenshots at 2x on the site root, each paired with `main`:

1. Full dock at 1280, nothing on.
2. Close crop of the housing: rest, a tile hovered, Play pressed, a tile focused (focus ring over its neighbours).
3. Loop on, Zoom at 200%, captions on (if the demo has captions; say if not), at comfortable and compact density.
4. A menu open (pressed, no light) next to Loop on (pressed, light).
5. The timeline with no range (idle handles), one handle set, both set.
6. Narrow dock at 390 and 320, with Loop on; a menu open on the narrow dock (B.5).
7. `prefers-contrast: more` and `forced-colors`: the housing, Loop on, idle handles.
8. Viewer tier: must match `main`.

Report: the preview URL, the pairs, the final values, the contrast output, what you added to markup, the `--fl-on` decision, anything that still looks like separate chips or a lighter "on" key, and what you could not verify. Describe what the screenshots show; do not call the result tactile or polished.

## B.8 Follow-up after review

Same branch, same rules.

1. **Menu edge.** B.5's value was wrong: white at 10% over the menu's own `#171717` is `#2e2e2e`, darker than before. Use a solid colour instead: `--fl-menu-edge: #424242` (1.78:1 against the dock, decorative). Keep `--fl-line` under more contrast. Check the narrow-dock crop again and say whether the edge now separates the menu from the dock.
2. **Toolbar buttons that are on.** B.3 contradicted itself: a toolbar button has no fill at rest, so the `surface-2` "latched" fill makes Zoom lighter when on. For toolbar buttons (Zoom, Captions, anything without a key fill), "on" is **no fill**: the light plus the icon or label at full `--fl-text`. Keys (Loop) keep the pressed treatment on `surface-2`. An open menu keeps its pressed fill (momentary, as today). Update the comment block in `skin.css` and the dock-polish check if it asserts the old fill.
3. **Screenshots you did not open.** Open and look at: the hovered and focused housing crops from the last build, `5-timeline-both-set`, and the Viewer pair. Report anything wrong in them.

New pairs at 2x on the site root, against the current `theme-b` shots: Zoom at 200% (comfortable and compact), Loop on next to Zoom on, and the narrow-dock menu edge. Push, preview deploy, no merge.
