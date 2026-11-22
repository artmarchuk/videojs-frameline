# Step 6c: Fixes before step 7

Six fixes from the review of the step 6 reports and from hand testing. No new features. Steps 7 and 8 do not start here.

Read first: `PROJECT-OVERVIEW.md`, `NOTES.md` (the step 6 sections), the step 6 file, and the mockups in `design/mockups/`, including `Narrow.dc.html`, which is now in the folder.

The accepted decisions from step 6 stay as they are: one row down to 1040 px, two rows below 640 px, the cut buttons kept, Picture-in-picture in Settings for Studio, and the Viewer's volume slider.

---

## F1. Platform zones: take the conservative values

A safe-zone guide must never promise space that the platform's UI may cover. Where sources disagree, use the **largest** unsafe margin, not the smallest.

- TikTok: top 12.5% (240 px of 1920) and bottom 34% (660 px of 1920). Keep the right rail at 16% wide unless a source gives more.
- YouTube Shorts and Instagram Reels: re-check your sources under the same rule. If any source gives a larger margin, use it.
- Write the rule as a comment at the top of `platform-zones.ts`, and next to each number note which source it comes from.
- Every platform keeps the "Approximate" label in the menu, the announcement and the README.
- README: add one line explaining that choosing a platform zone also turns on the 9:16 crop, because the zones are defined inside that frame.

**Done when:** the TikTok screenshot shows the larger zones, and the unit tests use the new numbers.

## F2. View menu: focus order follows reading order

When the View menu opens from the keyboard, focus now lands on "Crop: None" in the right column. Keyboard order must match visual order (WCAG 2.4.3).

- Put the items in the DOM in reading order: the left column top to bottom (Safe areas, Composition), then the right column (Crop, Platform zones), then the footer.
- Focus on opening goes to the first item, "Title safe".
- Arrow keys move through the items in that same order. Check that radio groups still work: arrows move between items, and Space or Enter selects.
- If the Video.js menu always focuses its first radio group whatever the DOM order, set focus on opening yourself. Say in the report what you found.

**Done when:** opening the menu with Enter or Space focuses "Title safe", and Down moves through the menu in reading order. Prove both with a test.

## F3. Range handles: anchor on the outer edge

Each handle is centred on its time today, so its body covers both sides of the point. Anchor them the way editing tools do, so the range edge is exact and the handle sits outside the range:

- **In handle:** its **right** edge is on the In point. The body hangs to the left, outside the range.
- **Out handle:** its **left** edge is on the Out point. The body hangs to the right, outside the range.
- The range band starts and ends exactly on those edges. Take the hand-tested screenshot as the problem example: the playhead at the In point should sit on the handle's edge, not cut through its middle.
- **Ends of the track:** an unset handle at 0 or at the duration must still be fully visible and grabbable. Add a horizontal gutter, at least one handle width, on both sides of the timeline area, and draw the ruler and track inside it. The ruler's 0 and the duration must line up exactly with the handle anchors. Do not clamp handles inside the track; that would make 0 and the end imprecise.
- **Hit area:** it stays at least 44×44 px on touch layouts. Grow it outward, away from the range, so the In and Out hit areas do not overlap when the range is very short. When the two do overlap, the handle being dragged wins, and a fresh press on the shared area goes to the handle whose anchor is nearer.
- **Snapping** (playhead, markers, within 5 px) and the drag bubble are measured from the anchor edge, not the handle's centre. Place the bubble over the anchor.
- **Focus ring:** a handle shows the accent focus ring only on keyboard focus (`:focus-visible`), never after a mouse drag. In the hand test, the ring stayed on after dragging.
- **Stacking:** the playhead draws above the handles.

**Done when:** in screenshots at 2x, the In handle's right edge and the Out handle's left edge sit exactly on the range band's edges and on their ruler times, at 0, at the end, and with a range set in the middle. Unit tests cover time to x for both anchors and the hit-area rule for short ranges.

## F4. No focus ring around the whole player

Pressing Tab on the page now draws the accent outline around the whole player, and it stays in fullscreen. It is distracting, and it tells keyboard users nothing the controls do not.

Do not just hide the outline. A focused element without a visible indicator fails WCAG 2.4.7. Remove the cause instead:

- Take the player's container (the element that gets this outline) out of the Tab order (`tabindex="-1"`, or none at all if nothing needs it). The first Tab stop inside the player becomes the first control, which already has its own focus ring.
- Hotkeys must still work: when any control in the player has focus, and after a click on the picture (clicking the picture may still focus the container from code, but must not show a ring, because that focus came from a pointer).
- Check where the Video.js hotkeys listen, and confirm against the installed package that they still fire with focus on a control. Report what you found.
- Fullscreen: no outline around the container. Controls keep their own focus rings.
- Re-run the step 2 gate keyboard checks on the Viewer and on Studio.

**Done when:** Tab from the page lands on the first control with only that control's ring showing; Space, K, J, L, F, M and the arrows work from there; clicking the picture and then pressing K plays and pauses; and no screenshot shows an outline around the whole player, in or out of fullscreen.

## F5. Narrow layout: align with `Narrow.dc.html`

`Narrow.dc.html` was missing during step 6, so the narrow layout followed the PNG. Open the source, read its sizes, order and spacing, and align the narrow layout with it.

- Where the mockup and the accepted breakpoints conflict (two rows below 640 px, three rows at 320 px), the breakpoints win. List each difference in the report.
- Take screenshots at 390 and 320 px and set them beside the mockup.

## F6. Screenshot at 1024 px

1024 px is a common laptop and tablet window, and it falls between the breakpoints. Take a Studio screenshot at 1024 px with a range set and the View menu open, and look for clipping, overlaps and crowding. Fix anything you find within the accepted breakpoints.

---

## Verification, deploy, tag

- Unit tests and the build pass. Re-run the step 2 gate checks on the Viewer on the public URL. The Viewer must still request no pro chunk.
- Screenshots in `design/screenshots/step-6c/`: View menu focus state, TikTok zones, handles at 0, in the middle and at the end (2x crops), Tab focus on the first control, 1024 px, 390 px and 320 px. Open them and look at them before reporting.
- Commit one group per fix (F1–F6), with the attribution lines from your session instructions.
- Deploy and tag `step-6c-fixes`.

## Report (short)

1. URL, screenshot folder, how the screenshots were taken.
2. One line per fix: done or not, plus anything that differs from this file and why.
3. F1: the final numbers for all three platforms and their sources.
4. F4: where the hotkeys listen, and whether anything else depended on the container being focusable.
5. F5: the list of differences from `Narrow.dc.html`.
6. What remains unverified.
