<!-- Archived from the claude.ai project "Video.js Frameline" on 17 Nov 2026. Historical: the first design direction for the landing page, before the Figma redesign. Not a spec. -->

# Frameline landing: design brief, "Cue sheet"

Owner: Artem Marchuk · Landing design chat · Nov 16, 2026
For: the Build chat (C), to turn into `specs/landing.md`
Mockup: "Frameline landing: Cue sheet" on the design canvas (https://claude.ai/artifact/SPMrd1okZr1PYGE3HAe63x).
Content, claims and priority come from "Frameline Landing: Product Marketing Brief". This brief sets layout, type, colour and motion only.

**Status (Nov 17):** historical. The live page was rebuilt from the Figma file (centred hero, "A monitor, not just a player.") and refined in `specs/landing-visuals*.md`; the repo's `apps/preview/src/page/tokens.css` holds today's values. The page is dark only: it does not follow the OS theme, and the light frames are gone from Figma.

Build estimate at the time: about 60 minutes. One HTML file, one CSS file and a small change to `main.tsx`. No new dependency, no web font, no image, no change to the skin.

## 1. The direction in three rules

1. **The player sits on a quiet dark page.** The page is flat and neutral, one step lighter than the player's surround; nothing else is tinted or shadowed, and the player keeps its hairline.
2. **The page is a cue sheet, not a card grid.** Features are rows on hairlines: key, claim, detail, "Show me". Every row acts on the player. No icons, no illustrations, no feature cards.
3. **Dividers and boundaries are drawn with the skin's own lines.** A ruler (the timeline's ticks) divides sections. A dashed line (the guides' line) marks what is out of scope. The accent blue stays reserved, as in the skin: links and focus rings only.

## 2. Tokens (`page.css`)

True neutral, replacing the blue-cast greys (this also closes the NOTES.md item on the page palette).

| Token | Value |
|---|---|
| `--page-bg` | `#161616` |
| `--page-surface` | `#1e1e1e` |
| `--page-sunken` | `#0f0f0f` |
| `--page-text` | `#f2f2f2` |
| `--page-dim` | `#a6a6a6` |
| `--page-line` | `#333333` |
| `--page-tick` (new, decorative) | `#5e5e5e` |
| `--page-control` | `#7d7d7d` |
| `--page-control-fill` / `-ink` | `#f2f2f2` / `#1c1c1c` |
| `--page-link`, `--page-focus` | `#5b9dff` |
| `--page-key` / edge / drop (new) | `#2c2c2c` / `#454545` / `#000000` |

Unverified at the time: these ratios were chosen by eye against the old, checked values. Update the rows in `scripts/contrast.mjs` and run it; if `--page-dim` on `--page-sunken` falls under 4.5:1, lighten the dim, not the surface. `theme-color` is `#161616`.

Type: the system stack already in `page.css`. No web font (the player loads first).

| Role | Size / line | Weight | Tracking |
|---|---|---|---|
| h1 | `clamp(30px, 2.8vw, 40px)` / 1.08 | 680 | -0.025em, `text-wrap: balance` |
| Two-line positioning | 17px / 1.4 (16px narrow) | Viewer line regular, dim; Studio line 600 | |
| h2 | 28px / 1.15 (24px narrow) | 680 | -0.02em |
| Row claim (h3) | 21px / 1.2 (19px narrow) | 650 | -0.015em |
| Body | 15px / 1.5 | 400 | |
| Small labels, ruler labels | 12px, 11px | 600, 400 | |

Wrap: 1280px + 24px gutters (16px under 720px). Radii: 8px controls and code, 10px panels, 6px keys, 2px on dashed boxes.

## 3. Layout, top to bottom

**Header** (64px): mark and "Frameline" left (a `p`, no longer the `h1`); nav right: GitHub, Features, artmarchuk.me.

**Hero** (two columns from 1100px: `336px | 1fr`, gap 48px, top-aligned; everything fits in 1440×900).
- Left: `h1` "A Video.js skin for the tools people make video with." Then the two lines. Then "Try it in the player" (a small `h2`) with three cue rows, a one-line note, and the "View on GitHub" button (secondary, outlined, 44px).
- Right: a 44px bar with the **Viewer / Studio** segmented switch on the left and one line of dim text on the right that changes with the tier ("Studio: the controls sit in a dock below the picture, never over it." / "Viewer: a clean player, controls over the picture."). Then `#player`.
- Under 1100px, one column in this order: h1 and two lines, switch, player, cue rows, GitHub. The player comes before the prompts so it is on the first screen of a phone.
- The player starts in Studio, paused on the hero frame, with a range set and Title safe on (`apiRef.setRange`, `apiRef.setGuides`, both in the README). A frame link in the URL hash (`#t=`) wins over this initial state.

**Cue rows** (hero): each is one real `button`, full width, 52px min, hairline below: keycaps (76px column), text, and "Show me" in link style at the right. They reuse the existing tasks: `range` (`I` `O` "Set a range and watch it loop"), `step` (`,` `.` "Step one frame"), `zoom` (`Z` "Zoom to the source's pixels").

**Ruler divider** between sections: 28px high, full wrap width, `aria-hidden`. Two tick layers along its bottom edge in `--page-tick`: 4px ticks every 8px and 10px ticks every 80px, plus a 1px baseline; one 11px label at the left, on the first major tick: "Check", "Host", "Out of frame", "Configure". CSS only (two `repeating-linear-gradient` backgrounds). It never moves.

**What Studio checks** (h2, one lead line, then five rows). Desktop row grid: `120px | 5fr | 6fr | auto`, gap 32px, 22px vertical padding, hairlines. Columns: keycaps, claim (h3), detail (dim), "Show me" button (outlined, 44px). Narrow: claim, detail, then keycaps and button on one line.

| Keys | Claim | Task |
|---|---|---|
| `I` `O` | A range that plays only itself. | `range` |
| `,` `.` | One frame at a time, in timecode. | `step` |
| `Shift` `V` | Guides for delivery. | `zones` |
| `Z` | Zoom that is true to the source. | `zoom` |
| `G` | The picture is never touched. | `grab` |

Detail lines are in the mockup; they are the product brief's points 2 to 6, shortened. Below the rows, one closing line with `Shift` `?` keycaps: keyboard, screen readers, the YouTube key map, "Built to WCAG 2.2 AA", zero axe violations in six states. No button there.

**Built to be hosted** (two columns `5fr | 7fr`, one column under 900px): left, the one-line two-tier statement, a five-row definition list (Data in, Events out, A handle, Flags, Slots and tokens) and two links (README, GitHub). Right, one code block on `--page-sunken` with a 1px line, 13px mono, focusable and scrollable. No install command.

**What Frameline won't do**: three items in a row (one column under 900px), each in a **1px dashed** box in `--page-control`, radius 2px: a 19px claim and a dim reason. No strike-through, no icons, no red.

**Configure**: the existing form, Code and Event log, restyled by the tokens only. Code and Event log sit side by side. The lead says "the player at the top". **Remove the "Try this" panel**: its six tasks now live in the cue rows and the feature rows (the `safe` task is dropped; Title safe is on from the start). The Tier radios here and the hero switch are the same state.

**Footer**: one line. GitHub and "Apache 2.0" left; "Designed by Artem Marchuk" right, linking to artmarchuk.me. The About text is removed; the page above now says it.

## 4. Behaviour

- **Show me** (cue rows and feature rows): scroll the player into view (`block: 'center'`; `behavior: 'auto'` under reduced motion), focus it, run the task, and write the result into one `role="status"` line that sits under the hero bar. In Viewer, a row first switches the tier to Studio and says so in the status line, instead of the old "needs Studio" note.
- **Hero switch**: radios in a `fieldset` with a visually hidden legend "Tier", styled as the existing `.segmented`. Changing it calls the same `setConfig(tierConfig(...))`.
- **Skip link**: "Skip to the player".
- **Touch** (`pointer: coarse`): keep the keycaps as labels; hide the note about focus. The rows still work as buttons.

## 5. Motion

Nothing on the page animates on load or on scroll, and nothing ever moves over or beside the player while it plays. Only: the segmented switch's selection (120 ms), button and row hover and press (colour only, 90 ms), and the Show me scroll. All of it is off under `prefers-reduced-motion`. This is the skin's own rule ("nothing that shows time animates") applied to the page.

## 6. Accessibility

- One `h1` (the headline); `h2` for "Try it in the player", "Player" (hidden), each section; `h3` for row claims and the three refusals.
- Landmarks: `header`, `nav`, `main`, `footer`. Rulers and the mark are `aria-hidden`.
- Keys are `kbd`. A row's button has an accessible name with the action ("Show me: set a range and watch it loop").
- Focus ring as today: 2px `--page-focus`, 2px offset, on every control including rows and the code block.
- 320px: nothing scrolls sideways except the code block, inside its own box. Targets 44px.
- `forced-colors`: the ruler and the dashed boxes fall back to `CanvasText` borders; the key drop shadow goes.
- The axe run's goal is zero serious or critical violations.

## 7. Open, for Build to check before writing the spec

1. **The snippet's API names.** The mockup uses `tier`, `fps`, `features`, `onInOutChange`, `apiRef`, `setRange` from today's README. Check them against `src/pro` as installed; the repo wins.
2. **The `Shift` `V` row** shows the key that hides and restores the guides. If the task should open the TikTok zones instead (the old `zones` task), keep the task and keep the keycaps; the detail line already names the zones.
3. **Hero footage.** `ACTIVE_SOURCE` is still `cosmicDawn`; the reel's playback ID is a placeholder. The layout does not depend on it. The initial range and frame must be chosen per source, in `media.ts`.
4. **Copy link (`S`)** is not named on the page; add it only once dock polish is live.
5. The timecodes and the duration in the drawn player are placeholders, not facts.

## 8. Not in this hour

A sticky or mini player while reading the rows; per-row screenshots or loops; a new mark or wordmark; an OG image refresh. All of these go to the Backlog sheet if wanted.
