# Before 0.1.0: `apiRef` before the player is ready, and CSS isolation

The last two engineering steps before the first npm publish. They are independent: do Part A first (smaller), then Part B, each as its own commit or commits, on one branch and one PR.

Read first: `CLAUDE.md` (rule 10, CI before main), `specs/PROJECT-OVERVIEW.md`, `NOTES.md`, `README.md` ("Driving the player", Tokens), `src/pro/studio/index.tsx` (the `useImperativeHandle` block), `src/pro/studio/controller.ts`, `src/styles/base.css`, `src/styles/tokens.css`, `src/video/skin.css`, `apps/preview/src/page/landing.css`, `scripts/browser-checks/manifest`.

The repo is public: commit messages, comments and docs are written for an outside reader.

## Delivery

Branch `before-publish`, own folder, a PR, CI green on the last commit, then fast-forward `main` (`CLAUDE.md` rule 10). The author deploys production. After his deploy, run `npm run check:browsers --base-url https://frameline.artmarchuk.me` and the artmarchuk.me embed check, then clean up.

---

## Part A: `apiRef` before the player is ready

The seek-race step found that `seek()` was dropped when the host called it between the handle's arrival and the controller knowing the video. `seek()` is now kept and sent later. The other methods may have the same gap, and what they do there is API behaviour we document for 0.1.0.

### A.1 Find out

For each method (`seek`, `step`, `setRange`, `setLoop`, `setGuides`, `setZoom`, `pan`, `grabFrame`), what happens today when it is called:
1. after the handle arrives but before the controller knows the video element;
2. before the media's duration is known;
3. before the first frame is decoded.

Use unit tests where the logic is pure, and a browser case with the Studio chunk held back and the media answered fast (the seek-race reproduction). Record a table.

### A.2 The rule (decided)

- **State methods apply at once:** `setRange`, `setLoop`, `setGuides`, `setZoom`. They change the store, and the picture follows when it exists. If one of them is dropped today, fix it.
- **Position methods wait for the media:** `seek` (as it does now), and `step`, which queues its frames and adds them up (`step(1)` twice before ready means two frames from where the video opens), applied once the duration is known. A `seek` replaces any queued steps; steps after a queued seek count from that seek's frame.
- **`pan` before ready or at Fit** does nothing, as at Fit today.
- **`grabFrame` before a frame is decoded** does nothing and gives one development warning. A grab that fires later would download a file the user didn't just ask for.
- **No new API:** no promise return values, no ready event. The handle is `null` until Studio's code has loaded, as today.

### A.3 Checks and docs

- Unit tests for the queue and its order; the browser case from A.1 extended to assert the rule for every method.
- README, "Driving the player": a short paragraph, or a column in the methods table, saying what each method does before the media is ready.

---

## Part B: CSS isolation

**Goal:** a host page's CSS doesn't change how the player looks or behaves, and the player's CSS doesn't change the host page. Hosts customise through the public tokens and the documented classes, not by accident.

### B.1 What we know

From the code at `c574907`; check again before relying on it:

- **Every skin stylesheet is inside cascade layers** named `base`, `components` and `utilities` (with `base.theme`, `base.preset` and `base.preferences` in the tokens). Its reset uses `:where(.media-skin) …`, so its specificity is zero.
- **By the cascade rules, any unlayered host rule beats every layered skin rule,** whatever the specificity. A host's plain `button { padding: 1rem }` or `kbd { … }` reaches the player. That's how the landing page's `kbd` and `button:focus-visible` rules leaked into it (A1.8, and the open focus-ring bug in the Engineering backlog).
- **The layer names are the same as Tailwind v4's** (`base`, `components`, `utilities`). In a Tailwind host, the two stacks merge into the same layers, and the order depends on which stylesheet the page declares first.
- The landing page guards its own rules with `:not(:where(.media-skin *))`. That's a workaround on the host's side, which no other host will know to write.
- The tokens are set on `.media-skin[data-theme="pro"]`, not on `:root` (good: nothing global). `@property` registrations are global, and harmless.

### B.2 The hostile-host check (write this first)

A new browser check, `host-css.js`, with fixture pages under `scripts/browser-checks/fixtures/` that render the same Studio and Viewer players as `/preview.html` inside a host page carrying hostile CSS:

1. **Unlayered element rules.** Margins, padding, borders, backgrounds, fonts, `line-height`, `letter-spacing`, `text-transform`, `list-style`, `display` and `box-sizing` set on `button`, `kbd`, `ul`, `li`, `svg`, `span`, `div`, `input`, `a`, `video` and `*`. Plus `font: 20px/2 serif`, `color` and `text-align: center` on the player's ancestors.
2. **A Bootstrap-style reboot,** unlayered. Write a representative excerpt of your own; don't copy Bootstrap's file.
3. **Tailwind v4's preflight,** in its own `@layer base`. Take it from the installed `tailwindcss` package (the workbench already depends on it), once loaded **before** the skin's CSS and once **after**.
4. **Out of scope, and documented as such:** host rules with `!important`, ID selectors, or selectors that name the skin's own classes. That is deliberate customisation.

What it asserts: the player's computed styles and boxes match those of the plain page (`/preview.html`) for every element `dom-snapshot.js` records, in Studio idle, with a menu open, at 1440 and 390 px. Add a screenshot comparison with a small tolerance as a second line of evidence, and look at the screenshots. **The reverse direction:** on a host page with no hostile CSS, the host's own elements have the same computed styles with and without the skin loaded.

Run it on today's `main` first, and record what leaks. It should fail. That list is the work.

### B.3 The fix (preferred approach; prove it with B.2, and change course if it fails)

1. **Namespace the skin's layers** under one named layer, such as `frameline` (`frameline.base`, `frameline.components`, …), so they never merge with a host's `base`, `components` or `utilities`. Check whether anything in `@videojs/*` that the skin loads depends on the old names.
2. **An unlayered guard,** a small block outside any layer, scoped to the skin's root class. It undoes host element rules without fighting the skin's own layered styles. The candidate mechanism: `.media-skin :is(button, kbd, ul, li, svg, span, div, input, a) { all: revert-layer; }`. Specificity (0,1,1) beats a host's bare element selector (0,0,1), and `revert-layer` hands the value back to the layered cascade, where the skin's components decide. `revert-layer` is inside the browser floor (Chrome 99, Firefox 97, Safari 15.4); check it against `specs/PROJECT-OVERVIEW.md`. Test that the guard doesn't break:
   - focus rings (`outline`);
   - transitions, and reduced motion;
   - `forced-colors` and `prefers-contrast: more`;
   - SVG presentation attributes (`all` resets `fill` and `stroke` set in CSS, but not attributes; verify the icons);
   - the Video.js elements the skin wraps.
3. **Inherited properties on the root.** Declare every inherited property the skin depends on, on the skin's root: `color`, the font properties, `line-height`, `letter-spacing`, `word-spacing`, `text-transform`, `text-align`, `text-indent`, `white-space`, `font-feature-settings`, `font-variant`, `list-style`, `cursor`, `visibility`, `direction` as set by the host on purpose (keep the existing RTL support). Then nothing flows in from host ancestors.
4. **Nothing reaches out:** no selector in `src/` that matches outside `.media-skin`. Check with a script over the built CSS, and add that script to CI.
5. **Overridable by design:** hosts can still change everything public through the tokens, and the documented classes with higher specificity. README, "Styling and isolation": what is protected, what isn't (the out-of-scope list in B.2), and how to customise.
6. Once the guard holds, **remove the landing page's `:not(:where(.media-skin *))` workarounds** only if `host-css.js` and the landing checks show they are no longer needed. Otherwise leave them, and say why.

**Visual identity:** this step must not change how the player looks on our own pages. `dom-snapshot.js` (markup) and a computed-style snapshot of the same elements must match `main` exactly. If a computed value changes, explain each one; it must be invisible or a fix of a leak.

### B.4 The open focus-ring bug

The landing page's unlayered `button:focus-visible` rule cuts the player's 3 px ring to 2 px under `prefers-contrast: more` (Engineering backlog). It must be fixed by B.3. Prove it in `host-css.js` or the landing checks.

---

## Verification

- Typecheck, tests, `build`, `build:lib`, the contrast script and `check:consumer` pass. Add one consumer case: the host app with the hostile CSS from B.2.1 and Tailwind's preflight.
- `npm run check:browsers` in all three engines; `host-css.js` passes in all three, before (recording the failures) and after.
- `dom-snapshot.js --compare` against `main`: identical. The computed-style comparison is identical, or every difference is explained.
- Screenshots, opened and looked at: Studio and Viewer on the hostile host page, before and after the fix, at 1440 and 390 px.
- Hard rule 8: `embed-link.js` in all three engines.
- CI green on the PR, then the merge.
- `NOTES.md` (the API table, the layer and guard decision and why, one Log line), `README.md`, `FEATURES.md` (isolation as a feature), and `CHANGELOG.md` under 0.1.0 (the layer names changed; how to customise).

## Report

1. Part A: the table from A.1, what changed, and the README text.
2. Part B: what leaked on `main` (the B.2 list), the approach you used and why, anything that didn't work, the computed-style differences, and the screenshots looked at.
3. The PR, the CI runs, the merge commit, the live checks after the author's deploy, and the clean-up.
4. What you could not verify (for example other CSS frameworks, or Shadow DOM hosts), and backlog proposals.
