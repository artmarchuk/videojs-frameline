# Theme A: edge lighting, a darker body, a neutral range

The first of three theme steps that move the Studio dock from "desktop software buttons" towards a device: one matte body, keys shaped by lit edges, one small accent. This step changes **tokens and a few CSS rules only**. No markup, no component, no behaviour, no layout changes.

Read first: `specs/PROJECT-OVERVIEW.md`, `NOTES.md` (the "Tactile controls" and contrast sections), `src/styles/tokens.css`, this file.

Reference: Figma frame `14:5` in file `WngORSR3hgjWjnTHqVmK3u` (three hardware devices). What we take from it: matte faces with no gradient, form from a crisp top-edge highlight and a contact shadow, seams between parts, a dark recessed display, and colour only in small signals. What we do not take: the light body, dot-matrix type, knobs, grain.

## A.0 Branch and deploy

- Branch `theme-industrial` from the current `main` (the icon trial is merged: most icons are now solid shapes). This spec file is untracked in the checkout: commit it on the branch first. Leave the other untracked files (`.claude/`, `specs/landing-visuals.md`) alone.
- **No production deploy.** `npm run deploy vercel` deploys to production; do not run it. Make a Vercel **preview** deploy of the branch instead (read `apps/preview/deploy.mjs` first; if it has no preview mode, run the Vercel CLI without `--prod`). Report the preview URL. If a preview deploy is not possible, say so and stop there; do not fall back to production.
- No tag. Push the branch to origin. Do not merge into `main`.

## A.1 Out of scope (later steps, do not build)

- Theme B: the transport as one keybed with seams, new radii, lit "on" indicators.
- Theme C: the larger timecode display.
- The Viewer tier and the overlay layout: they stay flat (`--fl-bevel: 0`) and must look the same as on `main`.
- The landing page (`apps/preview/src/page/`): its `--accent` and `--range` mirror Figma variables. Leave them; list the mismatch in the report under "Backlog proposals".
- Type: the system UI stack stays. No webfont.
- The accent stays `#5b9dff`. Only its area shrinks (A.4).

## A.2 Body: darker dock, a real seam

In `src/styles/tokens.css`:

| Token | Now | New | Why |
| --- | --- | --- | --- |
| `--fl-surface-0` | `#0f0f0f` | `#0c0c0c` | the display and the track groove sit clearly below the body |
| `--fl-surface-1` | `#1e1e1e` | `#171717` | keys (`surface-2`) separate from the body |
| `--fl-seam` (new) | none | `#050505` | the dark half of a seam |

`surface-2`, `surface-3`, `--fl-on`, text colours and ticks do not change.

- **Picture to dock:** in `src/video/skin.css`, `.pro-skin[data-layout="dock"] .pro-bar` takes `border-top: 1px solid var(--fl-seam)`. `--fl-dock-edge` becomes `inset 0 1px 0 rgb(255 255 255 / calc(0.06 * var(--fl-bevel)))`.
- **Dividers:** `.pro-main-divider` (studio.css) becomes a seam: `background-color: var(--fl-seam)` plus `box-shadow: 1px 0 0 var(--fl-hi)`. The same height and margins.
- `surface-1` is also the fill of menus and dialogs. They get darker with the dock; that is intended. Check that their `--fl-line` border still reads.

## A.3 Edge lighting instead of face gradients

Faces are flat. Form comes from the edges. Starting values below; tune them by looking at 2x screenshots, and record the final values in `NOTES.md`.

| Token | New value |
| --- | --- |
| `--fl-raise-image` | `none` |
| `--fl-raise-shadow` | `inset 0 1px 0 rgb(255 255 255 / calc(0.1 * var(--fl-bevel))), 0 1px 0 rgb(0 0 0 / calc(0.5 * var(--fl-bevel))), 0 2px 3px rgb(0 0 0 / calc(0.25 * var(--fl-bevel)))` |
| `--fl-press-image` | `none` |
| `--fl-press-shadow` | `inset 0 1px 2px rgb(0 0 0 / calc(0.55 * var(--fl-bevel)))` (the outer rim of light goes) |
| `--fl-play-image` | `none` (the face is `--fl-text`, flat) |
| `--fl-play-shadow` | `inset 0 1px 0 rgb(255 255 255 / calc(0.6 * var(--fl-bevel))), 0 1px 0 rgb(0 0 0 / calc(0.5 * var(--fl-bevel))), 0 2px 3px rgb(0 0 0 / calc(0.3 * var(--fl-bevel)))` |
| `--fl-play-press-image` | a flat `#dcdcdc` layer (`linear-gradient(#dcdcdc, #dcdcdc)`) |
| `--fl-solid-image` | `none` |
| `--fl-solid-shadow` | `inset 0 1px 0 rgb(255 255 255 / calc(0.18 * var(--fl-bevel))), inset 0 -1px 0 rgb(0 0 0 / calc(0.2 * var(--fl-bevel)))` |
| `--fl-handle-image` | keep the two grip lines; drop the `var(--fl-solid-image)` layer |
| `--fl-well-shadow` | `inset 0 1px 2px rgb(0 0 0 / calc(0.7 * var(--fl-bevel))), inset 0 0 0 1px rgb(0 0 0 / calc(0.4 * var(--fl-bevel))), 0 1px 0 rgb(255 255 255 / calc(0.05 * var(--fl-bevel)))` |

- **Press travel:** in `skin.css`, the `:active` content shift goes from `translate: 0 0.5px` to `0 1px`.
- The `prefers-contrast: more`, `forced-colors` and overlay blocks that set these tokens to `none` or flat stay as they are. Confirm that each token changed here is still overridden there.
- Update the comments above each token so they describe the new treatment. No stale "lit from above" gradient comments.

## A.4 The range is neutral; the accent is a signal

Today the accent fills the played part of the range and a darker blue (`--fl-range`) fills the rest: the largest coloured area in the dock. After this step the accent appears only on **set range handles, the selected marker and the focus ring**.

| Thing | Now | New |
| --- | --- | --- |
| Timeline track (`.pro-tl-track`) | `surface-2` | `surface-0`: a groove, darker than the body, keeps `--fl-track-shadow` |
| `--fl-range` (unplayed band) | `#4d7bc1` | `#6e6e6e` |
| `--fl-range-played` (new; `.pro-tl-band-played`) | `--fl-accent` | `#c8c8c8` |
| `--fl-buffer` | `#4a4a4a` | check it against the new track (2.21:1 computed); keep or adjust so it is visible but quiet, and record the choice |

Ratios computed for these values (WCAG, same maths as `scripts/contrast.mjs`); the script must reproduce them:

| Pair | Ratio | Minimum |
| --- | --- | --- |
| unplayed band `#6e6e6e` on track `#0c0c0c` | 3.84 | 3 |
| played band `#c8c8c8` against unplayed band | 3.05 | 3 |
| playhead (text) over the unplayed band | 4.55 | 3 |
| playhead (text) over the played band | 1.49 | none: the dark outline carries it |
| playhead outline (`surface-0`) over the played band | 11.69 | 3 |
| set handle (accent) on track | 7.18 | 3 |
| set handle (accent) against the unplayed band | 1.87 | none: decorative, the handle has a shape (as today) |
| idle handle `#787878` on track | 4.43 | 3 |
| focus ring: accent on `surface-0` / `surface-1` / `surface-2` / `--fl-on` | 7.18 / 6.58 / 5.13 / 3.41 | 3 |
| text-dim on `surface-1` | 6.53 | 4.5 |
| ruler label, blended, on the dock | 6.94 | 4.5 |

- Under `forced-colors`, `--fl-range-played` maps to `Highlight` and the two bands must still differ (as step 9.2 required). Under `prefers-contrast: more`, the played/unplayed pair must reach the script's "more" minimum; adjust the "more" values if needed.
- Search for every use of `--fl-accent` and `--fl-range` in `src/` and list in `NOTES.md` where the accent still appears after this step. If it appears anywhere other than set handles, the selected marker and focus rings, report it; do not silently change it.

## A.4b Legends: icons and labels on the keys

The icons are now solid shapes, so at `--fl-text` they carry much more light than the old outlines did and compete with the timecode. On a device the display is lit and the legends on the keys are printed. Make that distinction.

- **New token `--fl-legend: #d0d0d0`.** In the dock only, icons and word labels on controls at rest take it: transport keys, Loop, the link button, the flat toolbar buttons and "Fit". Chevrons keep `--fl-text-dim`. Computed: 11.62 on `surface-1`, 9.05 on `surface-2`, 7.37 on `surface-3`, 6.02 on `--fl-on`.
- **Full `--fl-text`** on hover, on `:focus-visible`, while pressed, and when the control is on or its menu is open. The colour transition already exists on `.media-button`.
- **Stay at `--fl-text`:** the timecode field, the count badges, the ruler, menus, dialogs, tooltips. Play keeps `--fl-ink` on its white face. Disabled states do not change.
- **A printed edge (try it, judge it by screenshot).** New token `--fl-legend-shadow: drop-shadow(0 1px 0 rgb(0 0 0 / calc(0.45 * var(--fl-bevel))))`, applied as `filter` to the icon element inside a dock button, never to the button itself. On Play the glyph is engraved instead: `--fl-legend-shadow-play: drop-shadow(0 1px 0 rgb(255 255 255 / calc(0.7 * var(--fl-bevel))))`. Find the right selector in `skin.css`; it must not break the `:active` translate or the link button's cross-fade.
- Look at close crops at **1x and 2x**. If the shadow makes any glyph look soft, doubled or dirty at 1x, remove the shadow (keep the colour change) and say so in the report. Do not keep it on some icons and not others.
- Flat cases: both shadow tokens are `none` in the overlay layout, under `prefers-contrast: more` and in forced colours. Under `prefers-contrast: more`, `--fl-legend` equals `--fl-text`; in forced colours it follows the existing `ButtonText` rules.
- Add the four legend pairs to `scripts/contrast.mjs` (minimum 4.5, because "Fit" is text).

## A.5 Accent trial (screenshots only, nothing shipped)

The author is undecided between the blue and a warm signal colour. Produce one extra screenshot set of the Studio dock with `--media-accent-color: #ff6b3d` set on the host (the public token; no code change): a range set, a marker selected, a focused button. Computed: 6.91 on `surface-0`, 6.34 on `surface-1`, 4.94 on `surface-2`, 3.28 on `--fl-on`. Put the blue and the orange versions side by side in the report. Do not change the default.

## A.6 Contrast script, docs

- Update `scripts/contrast.mjs`: new `s0`, `s1`, `range`, add `rangePlayed`, change the rows that measured the accent as a band into the pairs in A.4, and keep both columns passing. Paste the new table into `NOTES.md`.
- README token table (the `--fl-accent` row and any surface or range rows): new values and the new description of where the accent appears.
- `FEATURES.md`: no feature changes; fix any sentence that says the played range is drawn in the accent.
- `NOTES.md`: a "Theme A" section with final shadow values, the accent inventory, the buffer decision and Unverified. The landing page tokens go in the report under "Backlog proposals".

## A.7 Checks and report

Run `npm run typecheck`, `npm test`, `npm run build`, `node scripts/contrast.mjs`.

Screenshots at 2x device scale, which you open and look at, each **paired with the same shot from `main`**:

1. Studio dock at rest, 1280 wide.
2. Studio with a range set and the playhead inside it, a marker selected.
3. Close crop of the transport: rest, Play pressed (`:active`), Loop on.
4. Close crop of the timecode field and link button.
4b. Close crops of the transport and of the right-hand tools at 1x and at 2x, at rest and with one button hovered: the legends (A.4b).
5. A menu open (Guides), and the shortcuts dialog.
6. Narrow dock, 390 wide.
7. Viewer tier, controls visible over a bright frame: must match `main`.
8. `prefers-contrast: more` and `forced-colors: active`: Studio with a range.
9. The A.5 accent pair.

Report: the preview URL, the screenshot pairs, the final token values, the contrast output, anything that still looks like a gradient or a floating chip, and what you could not verify. Do not claim a look is "tactile" or "polished": describe what the screenshots show.
