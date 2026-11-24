# Test infrastructure and CI

Frameline's checks are good, but they run by hand. Each browser check's page, window sizes and context options live in a prose header that the person (or agent) running it has to read. This step makes the checks one command and puts them in front of every change on GitHub. It also fixes four flaky or engine-limited checks, so CI can trust them.

**No change under `src/` or `apps/`.** The site's build output must stay byte-identical. Several other sessions work on this repo; this step touches only `scripts/`, `.github/`, `package.json`'s scripts, and docs. That keeps collisions unlikely.

Read first: `CLAUDE.md`, `specs/PROJECT-OVERVIEW.md`, `NOTES.md` (the Checks section and its known failures), every file in `scripts/browser-checks/` (headers first), `scripts/consumer/`, `package.json`, `.nvmrc`.

The repo is public: commit messages, comments and docs are written for an outside reader.

## Delivery

Work on a new branch, `ci`, in your own folder. Merge as `CLAUDE.md` says. **No production deploy:** nothing the site serves changes. Push the branch to GitHub early, so the workflow runs on GitHub itself before the merge. Its result on GitHub is part of the verification.

## 1. A committed runner: `npm run check:browsers`

1. **A manifest**, `scripts/browser-checks/manifest.json` (or `.mjs`), with one entry per check:
   - the page and its query;
   - the window sizes, or touch contexts;
   - the context options (permissions, `reducedMotion`, `forcedColors`, `colorScheme`, device scale factor);
   - any fixture server it needs;
   - which engines it runs in;
   - its **known failures**: the assertion name, the engine and a one-line reason, copied from `NOTES.md`.

   Take every value from the check's own header; where a header is unclear, say so in the report rather than guessing. **Don't rewrite the checks' bodies** (only the four in section 4). The headers stay, and gain one line pointing at the manifest.
2. **The runner**, `scripts/browser-checks/run.mjs`, with `playwright-core`, which is already a devDependency:
   - builds once (or uses an existing `dist/`), serves it, and runs the checks;
   - **options:** `--engine chromium|firefox|webkit|all` (default all), `--only <name,…>`, `--base-url <url>` (to run against production or a preview instead of the local build), and `--repeat <n>` (for flaky hunts);
   - **Chromium** means Google Chrome (`channel: 'chrome'`), because the demo media is H.264.
3. **Output:** one line per check, engine and size: pass, fail, or known failure. A known failure doesn't fail the run; a new failure does. Also a short JSON summary in a temp folder for CI.
4. **`dom-snapshot.js` gets a compare mode:** `--save <file>` records the snapshot, and `--compare <file>` reports any difference by page, size, state and element. Document the routine: save on `main`, compare on a branch.
5. **Commands:** `npm run check:browsers` runs everything. Add it to `CLAUDE.md`'s Commands table and to `NOTES.md`'s Checks section, which then describes the manifest instead of the manual procedure.

## 2. CI on GitHub Actions

One workflow, `.github/workflows/ci.yml`, on pull requests and on pushes to `main`:

1. **Setup:** check out (a fresh clone, so an uncommitted build file fails here, like the one step B shipped), Node from `.nvmrc`, `npm ci`.
   - Check that `actions/setup-node` offers Node 26. If it doesn't yet, use the newest major it has, and say so in the workflow and in the report.
2. **Fast checks:** `typecheck`, `test`, `build`, `build:lib`, and the contrast script.
3. **`check:consumer`**, in Chromium only (the Firefox and WebKit runs stay local).
4. **`check:browsers --engine chromium`**, with Google Chrome installed on the runner. Every check in the manifest, against the local build. Firefox and WebKit stay local: their known failures are about headless limits, not regressions, and they double the time.
5. **Cache** npm and the Playwright browsers. Target under 15 minutes. Report the real time from GitHub.
6. **On failure,** upload the runner's summary and any screenshots the checks wrote, as artifacts.
7. **No secrets** and no deploy step. The workflow only reads the public demo media (Mux) from the network.

**Branch protection is the author's decision.** Don't change repository settings. In the report, list the exact GitHub settings that would make CI required for `main`. Since sessions push straight to `main` as a fast-forward, also say what that would change for them.

## 3. Engines and flakes in CI

If a check is flaky in CI (it passes on `--repeat 5` locally but fails on GitHub), mark it in the manifest as `flaky: <reason>`. CI then reports it without failing. Don't hide a real failure this way: report each one you mark.

## 4. Four checks to fix

1. **`dock-polish.js`: `keys` fails under load.** It reads the announcements 150 ms after the key. Make it wait for the live region's text to change (with a timeout) instead of a fixed delay. It must pass `--repeat 10` in all three engines.
2. **`phone-transport.js`: the touch drag uses a Chromium-only CDP call.** Replace it with a drag that Firefox and WebKit can run too. First find out from `src/` which events the playhead and handles listen to (pointer or touch); a Playwright touch context plus dispatched pointer events is one way, but check before choosing. Report what you used. It must pass in all three engines.
3. **`zoom.js` `grabSame` in WebKit** (two grabs of the same paused frame differ in a few pixel values, at 1x and 2x). Find out why: compare the two images, count and locate the differing pixels, and check whether WebKit re-decodes the frame. If the difference is the decoder's, compare with a small documented tolerance in WebKit only. If it's ours, report it and don't change `src/`.
4. **`link-open.js` in WebKit: a seek on load sometimes never lands** (2 of 4 runs on production on 23 Nov). **Investigate only:** run it with `--repeat 20`, record the timing of `loadedmetadata`, the seek and `seeked`, and report the cause, whether the check or the skin is wrong, and a proposed fix. If the skin is wrong, don't change `src/`; it becomes its own step. Mark it as a known failure in the manifest until then.

## Verification

- Typecheck, tests, `build`, `build:lib`, the contrast script and `check:consumer` pass locally.
- `npm run check:browsers` passes in all three engines, with only the known failures listed in the manifest. Run it once against production too (`--base-url https://frameline.artmarchuk.me`).
- The four fixed checks pass `--repeat 10` where the section says so.
- **The workflow runs green on GitHub** on the pushed branch. Report the run's URL and its time.
- Try one deliberate failure on a throwaway commit (for example a wrong expected value in a unit test), check that the workflow fails, then drop the commit before the merge.
- `dist/` is byte-identical before and after (`src/` and `apps/` untouched).
- Update `NOTES.md` (Checks, one Log line) and `CLAUDE.md` (Commands). Clean up afterwards (`CLAUDE.md` rule 8).

## Report

1. One line per section, and anything that differs from this spec.
2. The manifest: checks, engines, and every known failure or flaky mark, with its reason.
3. The CI run: its URL, time and Node version. The branch-protection settings for the author.
4. The four checks: what was wrong and what changed. For `link-open.js`, the cause and the proposed fix.
5. The merge commit. What you could not verify, and backlog proposals.
