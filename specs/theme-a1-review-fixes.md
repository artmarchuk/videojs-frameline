# Theme A.1: review fixes

Corrections after the author's review of Theme A. Same branch (`theme-industrial`), same rules as `specs/theme-a-edge-lighting-and-neutral-range.md`: styling only, no behaviour changes, no production deploy, a Vercel preview at the end, no merge. Commit this file first.

## A1.1 One range band, no played part

The band inside a range no longer shows the played part. The timeline does not highlight elapsed time anywhere else, so the range should not either: a range is one solid band, and the playhead shows the position.

- Remove the played band: the `.pro-tl-band-played` element and its rules, the `--fl-range-played` token, its `prefers-contrast: more` and forced-colours values, and its rows in `scripts/contrast.mjs`. Removing the element from the timeline component is allowed here; nothing else in the component changes.
- `--fl-range` becomes `#606060` (Theme A: `#6e6e6e`).

Computed (the script must reproduce these):

| Pair | Ratio | Minimum |
| --- | --- | --- |
| band on track `#0c0c0c` | 3.11 | 3 |
| playhead (text) over the band | 5.62 | 3 |
| set handle (accent) against the band | 2.31 | none: decorative, the handle has a shape and sits on the track edge |

Under `prefers-contrast: more` the band keeps a value that passes the "more" column; report it. Check `FEATURES.md`, the README and the help text for any mention of a played part of the range and remove it.

## A1.2 The groove is hard to see

The track (`surface-0`) against the dock (`surface-1`) is 1.09:1, so outside a range the timeline nearly vanishes. Add a rim of light under it, like the timecode well: `--fl-track-shadow` becomes `inset 0 1px 1px rgb(0 0 0 / calc(0.45 * var(--fl-bevel))), 0 1px 0 rgb(255 255 255 / calc(0.06 * var(--fl-bevel)))`. If the rim collides with the buffer line under the track, say so and show a crop; do not move the buffer.

## A1.3 Remove the printed edge

The author cannot see the printed edge under the glyphs, and a dark line on a dark key is close to invisible by nature. An effect nobody sees is not worth a filter on every icon. Remove `--fl-legend-shadow` and `--fl-legend-shadow-play`, the two `filter` rules in `skin.css`, and their overrides. The `--fl-legend` colour stays.

## A1.4 Shortcuts are text, not key caps

In tooltips and menus a shortcut is drawn as a boxed key, which is heavy and will not scale to menus with several shortcuts. Follow the macOS menu convention: plain text in a quieter colour.

- `.media-tooltip-shortcut` and `.pro-kbd` in **tooltips and menus**: no fill, no border, no shadow, no padding box. Same font and size as the label, regular weight, `font-variant-numeric: tabular-nums`.
- Colour: `--fl-text-dim-raised` in tooltips (4.5:1 on `surface-3` is already in the script), `--fl-text-dim` in menus. On a highlighted menu item the hint keeps the text colour, as today.
- Spacing: in a tooltip, a gap of `calc(var(--media-spacing) * 2)` after the label. In a menu the shortcuts are right-aligned in one column, with at least `calc(var(--media-spacing) * 4)` between the longest label and its shortcut.
- The strings do not change ("Shift+V" stays "Shift+V"; no platform glyphs).
- The **shortcuts help dialog** keeps its key caps, because there the keys are the content and a row can hold several. Make the caps flat: a `surface-2` fill, no raise shadow.

## A1.5 Three kinds of control, applied consistently

Theme A left two exceptions: Loop on row one is a "ghost key" (a raise shadow with no fill), and the link button is a filled raised key. The rule from now on:

| Kind | Which controls | Treatment |
| --- | --- | --- |
| Key | the transport groups, Play, Loop on row one | `surface-2` fill (Play: white), raise shadow; pressed in when on or held |
| Display | the timecode field and the link button | one recessed well |
| Toolbar | everything else | flat, a fill on hover only |

- **Loop** (row one, centre column) gets the `surface-2` fill like a transport group, with the same radius and raise shadow. Its on state is unchanged in this step.
- **The link button** joins the timecode's well: `surface-0` fill, the well shadow, no raise, no 2px gap. A seam (`--fl-seam`, 1px, with `--fl-hi` beside it) separates it from the digits. The outer corners keep the group radius, so the pair reads as one field with a trailing action. Hover: the icon goes from `--fl-legend` to `--fl-text` and the cell takes a `surface-1` fill. Pressed and the copied check behave as today. The focus ring must still draw over the neighbour.
- On the compact (narrow) dock, Loop as a cell of row two stays a flat toggle, as today.
- Update the "Tactile controls" comment block in `skin.css` to state this rule.

## A1.6 Housekeeping

- Update `specs/PROJECT-OVERVIEW.md` where it still describes the accent filling the range, a played part of the range, and the macOS window grey.
- Run the browser-check scripts in `scripts/browser-checks` that cover the Studio dock, `prefers-contrast: more` and `forced-colors`. Report what ran and what failed.
- Update the Theme A section of `NOTES.md`, the README token table and the contrast table.

## A1.7 Screenshots and report

At 2x, each paired with the Theme A shot:

1. The timeline with a range and the playhead inside it; the timeline with no range.
2. The transport with Loop off and on.
3. The timecode and link pair: rest, link hovered, link focused, just after a copy.
4. A tooltip with a shortcut (Guides), the capture menu with its two shortcuts, a Studio menu with a highlighted item.
5. The shortcuts dialog.
6. The full dock at 1280 and the narrow dock at 390.
7. `prefers-contrast: more` and `forced-colors`: the dock with a range and a menu open.

Report the preview URL, the pairs, the contrast output and what you could not verify.

## A1.8 Follow-up: the landing page's `kbd` style leaks into the player

A1.4 was not visible on the site. The skin's rule is right, but `apps/preview/src/page/landing.css` has a global, unlayered `kbd { … }` rule (the landing page's key caps). The skin's CSS sits in cascade layers, and unlayered styles beat layered ones whatever their specificity, so on the landing page every shortcut in the player's tooltips and menus is drawn as the landing page's key cap. The workbench has no such rule, which is why the A.1 screenshots showed plain text.

1. **Scope the landing rule** to the page's own key groups: `kbd` becomes `:where(.cue-keys, .feature-keys) > kbd` (check `index.html` for any other `kbd` outside the player and include its container). Nothing else on the landing page changes.
2. **Make the skin's shortcut rule complete**, so a host rule that sets only some properties cannot add a box: `.pro-kbd` and `.media-tooltip-shortcut` in tooltips and menus also set `display: inline; min-width: 0; height: auto; padding: 0; border: 0; border-radius: 0; background: none; box-shadow: none; filter: none`. The dialog caps (`.pro-shortcuts .pro-kbd`) keep their own rule.
3. **Document the limit** in the README section for hosts and in `NOTES.md`: the skin's styles live in cascade layers, so an unlayered element selector on the host page (`kbd`, `button`, `dialog`) overrides them; hosts should scope such rules or put them in a layer.
4. **Screenshots on the landing page itself** (`index.html`, the site root), not the workbench: the capture menu, the Guides tooltip, the Studio settings menu with its `?` item, the narrow-dock menu. Each paired with the current production site.

Commit on `theme-industrial`, preview deploy, no merge.
