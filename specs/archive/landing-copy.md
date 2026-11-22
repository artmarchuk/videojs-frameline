# Landing page: copy from the Brand content doc

The "Frameline Brand Content" doc in the claude.ai project holds the approved wording; where the page differs, the doc wins. This change brings the page's head tags, social card and footer in line with it. No layout or skin changes.

Continue on `landing-visuals`. Deploy a preview; the author merges.

## Changes

| Where | Now | Change to |
|---|---|---|
| `<title>` | Frameline — a Video.js skin for video creators | Frameline — a Video.js skin for video tools |
| `<meta name="description">` | Frameline is a Video.js v10 skin that adds a preview monitor … zoom and frame grabs. | Adds a preview monitor to the player in your editor, AI generator or review tool: timecode, frame stepping, In/Out loops, safe areas, platform crops and zoom. |
| `og:title`, `twitter:title` | Frameline | Frameline — a monitor, not just a player. |
| `og:description`, `twitter:description` | A Video.js skin for the tools people make video with. | Frameline is an open-source Video.js skin for web video editors, AI video generators and review tools. Viewer is a clean player; Studio is a preview monitor. |
| Social card image (`og.png`), the line under the tagline | A Video.js skin for the tools people make video with. | A Video.js skin that adds a preview monitor to the player in your video tool. |
| `og:image:alt`, `twitter:image:alt` | The Frameline card: … (about 50 words) | Frameline — A monitor, not just a player. A Video.js skin that adds a preview monitor to the player in your video tool. The Studio dock under a green-screen picture. |
| Footer credit | Designed and built by Artem Marchuk | Designed by Artem Marchuk (the name still links to artmarchuk.me) |

Copy every line character for character, including the em dashes, the slash in "In/Out" and the full stops.

## The card image

- Regenerate `og.png` with `scripts/og-image.mjs`, with the descriptor as its second line. Everything else on the card stays.
- The descriptor is longer than the old line. It must fit on one line at the card's current size; if it doesn't, wrap it to two balanced lines rather than shrinking the type. Report which.

## Already right, leave as they are

The H1 ("A monitor, not just a player.") and the line under it ("A Video.js skin that adds a preview monitor to the player in your video tool.").

If a script or check writes or tests any of the changed strings, update it too. Note the change in `NOTES.md`.

## Verify

1. The built page's `<head>`: paste the changed lines into the report. Count the title (60 characters at most) and the meta description (about 155).
2. `og.png` opened and looked at.
3. The footer at 1440 and 390 px.
4. Typecheck, tests, build, the landing check.
