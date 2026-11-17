# Theme A.2: one menu surface, and the last landing-page leak

Same branch (`theme-industrial`), same rules as the Theme A specs: styling only, no behaviour changes, no production deploy, a Vercel preview at the end, no merge, no tag. Commit this file first.

## A2.1 Studio menus take the settings menu's surface

Theme A darkened the body, but the Studio menus (Guides, capture, markers, zoom: everything with `.pro-menu-popup`) still use `--fl-surface-3` (`#3a3a3a`). They are now the lightest large area on screen, next to a settings ("More") menu that is `--fl-surface-1`. The author wants one menu surface: the settings menu's.

All Studio menus follow the settings menu:

| What | Studio menu now | New (as the settings menu) |
| --- | --- | --- |
| Popup fill | `surface-3` | `surface-1` |
| Highlighted item | `--fl-on` | `surface-2` |
| Hints, shortcuts, sub-labels (`.media-menu-hint`, `.pro-kbd`, `.pro-menu-sub`), the intro note at the top of Guides | `--fl-text-dim-raised` | `--fl-text-dim` |
| Group labels ("Safe areas", "Crop") | as they are | check: they must be at least `--fl-text-dim` |
| Dividers and the column line | `--fl-divider` | unchanged; check that they still read on `surface-1` and say if not |
| Popup edge and shadow | Studio's own | the settings menu's, so both menus look like one family. Use or share the existing rule; do not invent a third. |

- On a highlighted item, hints may stay at `--fl-text-dim` (5.09:1 on `surface-2`). Remove the rule that switched them to the text colour on highlight if nothing else needs it.
- The selected radio dot, the checkbox marks and the disabled item style: check each against the new fill.
- Tooltips and the toast stay `surface-3`: they are small, short-lived and must separate from the dock.
- The popup sits over the dock, which has the same colour. Its edge must separate it there. Take a screenshot of a Guides menu opened from the dock and say whether it does.

Computed (the script must reproduce these, and drop the rows that measured text on `surface-3` menus):

| Pair | Ratio | Minimum |
| --- | --- | --- |
| text on `surface-1` | 16.01 | 4.5 |
| text-dim on `surface-1` (hints, notes, shortcuts) | 6.53 | 4.5 |
| text on `surface-2` (highlighted item) | ~14 (compute) | 4.5 |
| text-dim on `surface-2` (hint on a highlighted item) | 5.09 | 4.5 |

Under `prefers-contrast: more`, the dim text is already `#cccccc`; confirm the "more" column passes.

## A2.2 The landing page's `button:focus-visible` leaks into the player

From the A1.8 report: `apps/preview/src/page/landing.css` has a global `button:focus-visible` rule (in the list starting with `a:focus-visible`) that reaches the player's buttons and, under more contrast, cuts the player's 3px focus ring to 2px on the site root. Scope that list so it does not apply inside the player (for example `:not(.media-skin *)` on each selector, or scope it to the page's own containers). The page's own focus rings must look the same as before.

While there, check the page's other global rules for leaks into the player: `*, *::before, *::after` (box-sizing), the margin and padding reset on `p, ol, ul, dl, dd, fieldset, legend, pre`, and `a`. The shortcuts dialog uses `dl` and `dd`. Compare the dialog, the menus and the tooltips on the site root with the workbench; fix any difference by scoping the page rule, and list what you checked.

## A2.3 Screenshots and report

At 2x, on the **site root**, each paired with the A1.8 shot:

1. Guides menu opened from the dock, with an item highlighted.
2. Capture menu and markers menu.
3. Settings ("More") menu, to show the two menu families now match.
4. The zoom menu, if it has one.
5. A focused button under `prefers-contrast: more` (A2.2).
6. The shortcuts dialog (A2.2 check).
7. Guides menu under `prefers-contrast: more` and `forced-colors`.

Report the preview URL, the pairs, the contrast output and what you could not verify.
