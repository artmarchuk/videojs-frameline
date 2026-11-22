# Landing page: one sentence for frame links

Frame links now carry seconds (`t`) and the timecode (`tc`). The landing page's "Point at an exact moment." row still describes the old link ("as timecode"). This change updates that one detail paragraph. Text only: no layout, no new row, no "Show me" task, nothing under `src/`.

The wording comes from the "Frameline Brand Content" doc in the claude.ai project (section "Feature lines", "Frame links"); that doc holds the approved words.

Work on a new branch, `landing-frame-links-copy`, from `main`. Deploy a preview; the author merges.

## The change

In `apps/preview/index.html`, the `.feature-detail` paragraph of the row "Point at an exact moment.":

Now:

> The host’s markers show as pins on the ruler and in the Markers menu. S copies a link to the frame on screen, as timecode. Opening the link lands on that frame, paused.

New:

> The host’s markers show as pins on the ruler and in the Markers menu. S copies a link to the frame on screen. It opens on that exact frame, paused, and because it carries seconds as well as the timecode, it still reads outside Frameline.

Use the page's curly apostrophe in "host’s", as now. Every other character as above.

## Check the claim against the repo first

Before changing the page, confirm in the README and the code that today's build does all of this:

- `S` copies a link to the frame on screen;
- opening the link lands on that exact frame, paused;
- the link carries the time in seconds (`t`) as well as the timecode (`tc`).

If any of these isn't true, stop and report; don't soften the sentence yourself.

The sentence deliberately doesn't claim that the Viewer opens the link, that a link can carry a range, or that other players land on the exact frame. Don't add any of these.

## Also

- If the row's "Show me" task, its status message or `FEATURES.md` describes the link "as timecode", bring it in line with the README. Report what you changed.
- `NOTES.md`: one line.

## Verify

1. The paragraph in the built HTML matches the new text exactly (compare as a string).
2. The row at 1440 and 390 px, opened and looked at: the longer detail doesn't push the row's figure or button out of place.
3. Typecheck, tests, build, the landing check.

## Report

The preview URL, the two screenshots, and anything the repo contradicted.
