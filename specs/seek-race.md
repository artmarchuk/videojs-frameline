# Seek race: a requested frame always lands

A frame the skin was asked to show must end up on screen. Today it can be lost when the request meets a seek the skin didn't make. The CI step traced one case to the millisecond, and two other symptoms look like the same family:

1. **Frame links in WebKit** (the `link-open.js` known failure). hls.js seeks to 0.121 s at start-up to skip a gap at the start of the stream. The skin applies the link's seek while that seek is still running. On `seeking`, `useFrameSnap` in `src/pro/studio/timeline/index.tsx` snaps hls.js's 0.121 to 0.1167, and that replaces the link's seek. The video lands at 0.117.
2. **The landing page's staged opening** (the `configurator.js` `stagedOk` known failure on GitHub's runners, 5 of 6 loads; the Website tab's hero bug). The staged range is set, but the runner's event log shows no seek issued at all. The cause is not known yet. `apiRef.seek` goes through `seekToFrame` in `controller.ts`, which queues the frame while `video.seeking` is true. The queue is sent on any `seeked`, so a lost queue is not the obvious answer. Candidates: `useFrameSnap` replacing the seek as in case 1; the page's `stage()` running before the handle or the duration is ready; the seek being issued but superseded before its `seeking` fires.

Read first: `CLAUDE.md`, `NOTES.md`, the CI report's section 4 (the timeline above), `src/pro/studio/controller.ts` (`seekToFrame`, the link effect, the range engine's `ownSeek` and `otherSeek`), `src/pro/studio/timeline/index.tsx` (`useFrameSnap`), `apps/preview/src/page/main.tsx` (`stage`), and `scripts/browser-checks/manifest`.

The repo is public: commit messages, comments and docs are written for an outside reader.

## Delivery: the new merge routine

This step starts a rule for every later step. Add it to `CLAUDE.md` under "Branches and deploys":

> **CI before main.** Push your branch and open a pull request. Wait until CI is green on your last commit, then fast-forward `main` (`git push origin <branch>:main`). If `main` has moved, merge it into your branch, push, and wait for green again. Never fast-forward a commit that CI hasn't passed.

Follow it here: branch `seek-race`, own folder, a PR, CI green, fast-forward. The author deploys production. After his deploy, run the live checks below and clean up.

## 1. Confirm both causes before changing anything

1. **Link:** rebuild the failing case deterministically, without relying on timing luck. For example, set `currentTime` to a foreign value from the page just before the skin applies the link, or hold the Studio chunk back 0.5 to 1.5 s as the investigation did. Record the event order.
2. **Landing:** reproduce `stagedOk` (hold the Studio chunk, or start a foreign seek just before `apiRef.seek`). Find the cause among the candidates above, or another one. Fix it in this step only if it fits the rule in section 2. If the fix belongs in the page (`apps/preview/src/page/main.tsx`), that is allowed here too. Otherwise stop and report.

## 2. The rule

> A frame the skin was asked for (by a frame link, by `apiRef.seek`, or by frame stepping) is the target until it lands. A seek the skin didn't make never replaces the target. The target is re-asserted until it lands, within limits. User input always wins.

What this means in the code. These are guidelines; keep the change as small as the rule allows:

- **`useFrameSnap`** doesn't snap a foreign seek while a target is pending. It still snaps the target's own seek and any seek made while no target is pending, as it does today.
- **A queued target** (`seekToFrame` while `video.seeking`) is already sent on the next `seeked`, whoever made the seek. Keep that.
- **Re-asserting:** on `seeked`, if a target is pending and the video isn't on the target frame, seek to the target again. At most 3 times, then give up, clear the target, and give one development warning. This stops it from fighting a stream that really can't land there, such as a frame inside a hole hls.js keeps skipping.
- **User input clears the target:** a pointer down on the timeline, a key the skin handles, or a play the user starts. The skin never pulls the user back to an old target.
- **A frame link stays paused** as today (`linkHeldUntil`), and the range engine's `ownSeek` and `otherSeek` logic keeps working: a user seek outside the range still pauses there.
- Put the decision in a pure function in `studio/logic.ts`, unit-tested on the event orders from section 1, the limit, and user input.

## 3. Checks

- Turn the reproductions from section 1 into browser checks, or into new cases of `link-open.js` and `configurator.js`. They must fail on today's `main` and pass on the fix. Show both in the report.
- `link-open.js` passes `--repeat 30` in WebKit (it failed 2 of 34 with a delayed chunk) and `--repeat 10` in Chromium and Firefox.
- `configurator.js` `stagedOk` passes `--repeat 20` in Chromium locally **and on GitHub**: push a commit that runs it repeated in CI, then drop that commit before the merge.
- Remove both known-failure marks from the manifest. CI must be green without them.
- Everything else: `npm run check:browsers` in all three engines, with only the remaining known failures. Typecheck, tests, `build`, `build:lib`, the contrast script, `check:consumer`, and `dom-snapshot.js` compared with `main` (no difference).
- Hard rule 8: `embed-link.js` in all three engines.

## 4. Docs

- `NOTES.md`: the race, the rule, the two causes, the Log line. Update the Architecture paragraph on the range engine and frame links.
- `FEATURES.md` only if a behaviour a user can see changed (it shouldn't).
- The Website tab's hero bug may be fixed by this step. Say so in the report; the author closes it.

**After the author's production deploy:** run `npm run check:browsers --base-url https://frameline.artmarchuk.me` and the artmarchuk.me embed check (play, step frames, copied link opens the frame), then clean up (`CLAUDE.md` rule 8).

## Report

1. The two causes as confirmed, with the event orders.
2. The change: the files, and how the rule maps to them.
3. Before and after for each reproduction. The repeat results, local and on GitHub (with the run URLs).
4. The manifest marks removed; anything that still fails.
5. The PR, the merge commit, the live checks after the deploy, and the clean-up.
6. What you could not verify, and backlog proposals.
