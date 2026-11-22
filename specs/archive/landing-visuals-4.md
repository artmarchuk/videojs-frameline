# Landing page, round four: the tier switch under the player, a floating player, no jump on load

Read first: `specs/landing-visuals-3.md`, the landing section of `NOTES.md` (including the layout-shift notes), `apps/preview/index.html`, `apps/preview/src/page/landing.css`, `tokens.css`, `main.tsx`, this file.

Continue on `landing-visuals` in its worktree. Deploy a preview; the author merges. **Everything in this round is page code.** Nothing under `src/` changes, and the skin gains no rim, shadow or new token. The screenshots are not touched and not re-shot.

## 1. The tier switch moves under the player

The Viewer / Studio switch and its hint leave the bar above the player and join Configure in one row under it. Both are tools for trying the skin, so they sit together, and the hero gains the bar's height.

- **From 760 px:** one row under the player: the switch on the left, the tier hint next to it (dim, fills the space), the Configure button on the right. The "Studio · Dock · 11 of 11 features on" summary stays under the Configure button, aligned to its right edge, and stays its accessible description. The Configure panel still opens below the row, full width.
- **Under 760 px:** the switch and Configure share the first line if both fit at their full size; otherwise the switch is on line one and Configure on line two. The hint goes under the switch. Nothing shrinks below a 44 px target.
- Tab order: the player, the switch, Configure. The switch keeps its fieldset, hidden legend "Tier", and arrow-key behaviour.
- The gap between the player and the row is `--space-24` (it leaves room for the shadow in part 2).
- The hero's player-width formula subtracts what is above the player; update it for the removed bar, and report the new player top and dock bottom at 1440 × 900 and 1920 × 1080.

### Keep the switch where the pointer is

Viewer has no dock, so changing the tier changes the player's height, and the row under it moves. The control the visitor just used must stay where it was on screen:

- When the tier changes from the hero switch or from the Tier radios in Configure, note that control's position before the change and, once the new layout has settled, scroll the page by the difference so it is back in the same place. Instant: no smooth scrolling, also without reduced motion.
- First check whether the browser's own scroll anchoring already does this (Chrome and Firefox anchor to content below a change). Use it where it works; add code only where it doesn't, and report which browsers needed it. Safari was not tested before; test it if you can, else say so.
- Compensate only: never scroll to reveal anything. If the page is at the top and can't scroll far enough, let the row move.
- The author is unsure about this behaviour and will decide after trying it on the preview. Keep it in one small, separate function so it can be removed in one change.

## 2. The player floats above the page

The page (`#161616`) and the dock (`#1E1E1E`) are almost the same lightness, so the product and the page around it run together. The player should read like an app window floating on a dark macOS desktop: a light rim around it and a deep, soft shadow below.

- Apply it to the page's wrapper around the player, as page CSS. Not inside the skin, not through a skin token.
- **Rim:** a 1 px light hairline around the player's whole outline, about white at 10–12%, following the player's corner radius. If the skin's own frame hairline then shows as a second line, the page may set the skin's public `--media-border-color` (documented in the README) to `transparent` on this page, and report it.
- **Shadow:** layered, like a macOS window: a tight dark contact edge (black, 1 px spread, about 50%), a short shadow close below (about 0 8px 20px, black 35%), and a large ambient one (about 0 24px 64px with 8 px spread, black 55%). Tune by eye on the preview until the player clearly sits above the page at 1440 and 390 px without the shadow reaching the text of the next section. Report the final values.
- Same treatment in Viewer and Studio. None in fullscreen (it is outside the fullscreen element anyway). None on the feature figures, the configurator panels or any other box.
- New tokens: `--elevation-player-rim` and `--elevation-player-shadow` in `tokens.css`. Name them in the report so the author can add them to Figma.
- `prefers-contrast: more` and forced colours: no shadow; the rim becomes a solid 1 px `CanvasText`-safe line (in forced colours, a system colour).

## 3. No jump on load

The page reserves the dock's height before the Studio code arrives, so nothing below the player moves when the dock appears.

- New tokens, mirroring the Figma variables (collection "Frameline page layout", same value in every mode):
  - `--size-dock: 117px` (exists): one-row dock.
  - `--size-dock-narrow: 167px`: two-row dock, player 500–739 px wide.
  - `--size-dock-narrow-portrait: 181px`: two-row dock, player under 500 px wide.
- Choose the reserved height by the **player's** width with the skin's own rules (a container query on the player wrapper, not the viewport), including the skin's rule that a touch device gets the two-row dock at any width.
- Reserve only while the tier is Studio and the dock is not yet rendered. In Viewer, reserve nothing.
- Add a check to the landing browser check: after load, the reserved height equals the rendered dock height (±1 px) at 1440, 900, 760 and 390 px, and on a touch device at 820 px. If a touch height differs from the tokens, report the measured value; don't change the token.
- The new phone value `--layout-hero-text-gap: 12px` (was 8) is already in Figma; set it in `tokens.css`.

## Verify (real screenshots, opened and looked at)

1. The hero in Studio and in Viewer at 1440 × 900, 1920 × 1080, 760 and 390 px. Save under `design/screenshots/landing-visuals-4/`.
2. The player against the page at 1440 and 390 px, cropped to the player's edges and the shadow: the rim and the shadow are visible, and there is no double line.
3. Tier changes by mouse and by keyboard, from the hero switch and from Configure: the control's position before and after, in pixels.
4. Layout shift on first load (staged Studio) at 390, 760, 900, 1100 and 1440 px, before and after this round. Target: under 0.02 at every width.
5. Axe audit (zero serious or critical), typecheck, tests, build.

## Report

The preview URL; the player top and dock bottom at 1440 × 900 and 1920 × 1080; the final rim and shadow values; which browsers needed the scroll code; the layout-shift table; anything the repo contradicted.
