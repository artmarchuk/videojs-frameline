# Docs and repo clean-up

Two housekeeping jobs in one step, before the API 0.1 work starts:

- **Part A, git:** remove dead worktree entries and merged branches, and get the main checkout clean and current.
- **Part B, docs:** the project overview becomes the post-contest roadmap, `NOTES.md` is split into a short current-state file and a history archive, and the specs of finished steps move to `specs/archive/`.

No change under `src/`, `apps/` or `scripts/`. The site's build output must not change.

The repo is public: commit messages and docs are written for an outside reader.

Read first: `CLAUDE.md`, `specs/PROJECT-OVERVIEW.md`, `NOTES.md`, `FEATURES.md`, and `specs/docs-refresh/PROJECT-OVERVIEW.md` (the new overview, written in the planning chat).

---

## 0. Before you start

1. `git fetch --prune`. List the worktrees (`git worktree list --porcelain`), the local branches and the remote branches.
2. **Wait for the landing session.** On 22 Nov the `landing-frame-links-copy` session was finishing its merge. Start Part B only when that branch is in `origin/main` (`git merge-base --is-ancestor origin/landing-frame-links-copy origin/main`, or the branch is gone), or when the author tells you to go ahead.
3. **Stop and report** if any other worktree that still exists on disk has uncommitted changes to `NOTES.md`, `CLAUDE.md`, `FEATURES.md` or `specs/PROJECT-OVERVIEW.md`. Those changes must not be lost or overwritten.
4. Work on a new branch, `docs-cleanup`, in your own folder (a git worktree), as `CLAUDE.md` says.

## Part A: git

**A1. Worktrees.** Run `git worktree prune --dry-run -v`, then `git worktree prune`. This removes only entries whose folders no longer exist. On 22 Nov these were prunable: `videojs-frameline-landing-frame-links-copy`, `videojs-frameline-frame-links-pause`, and a detached `scratchpad/prod-fix` under `/private/tmp`. Never remove a worktree folder that exists and is not yours; list it in the report.

**A2. Local branches.** For each local branch other than `main` and `docs-cleanup`:
- merged (`git merge-base --is-ancestor <branch> origin/main`) and with no worktree: `git branch -d <branch>`;
- not merged: keep it and list it with its last commit and date.

**A3. Remote branches.** For each `origin/<branch>` other than `main`:
- merged into `origin/main` and with no worktree on this machine: `git push origin --delete <branch>`;
- not merged: keep it and list it.

The author authorises this one-time clean-up of branches whose sessions have ended. `CLAUDE.md` rule 8 still applies from here on.

**A4. The main checkout** (`/Users/artoix/Sites/videojs-frameline`) stays on `main`. It is also where specs written in chat are dropped as untracked files. On 22 Nov it held three untracked items and was one commit behind `origin/main`:

| Item | What it is | Do |
| --- | --- | --- |
| `.claude/settings.local.json` | Claude Code's local settings on this machine; may hold personal permissions | Add `.claude/settings.local.json` to `.gitignore` on your branch. Don't commit, move or delete the file |
| `design/history/landing-cue-sheet.md` | The first landing design brief, archived on 17 Nov; its header says it is history, not a spec | Commit it on your branch, as it is |
| `specs/landing-frame-links-copy.md` | The landing session's spec | If `origin/main` now holds an identical copy (`cmp`), the untracked one is redundant (A5 removes it). If it is not in `origin/main`, leave it alone and report |

This spec's own files (`specs/docs-and-repo-cleanup.md`, `specs/docs-refresh/PROJECT-OVERVIEW.md`) are also untracked there. Copy them into your folder and commit them on your branch (Part B moves the overview into place).

**A5. After the merge** (end of this step): in the main checkout, remove each untracked file only if `origin/main` holds an identical copy (`cmp`), then `git pull --ff-only`. The result is `git status` clean, on `main`, up to date with `origin/main`, with `.claude/settings.local.json` ignored. Report that `git status`.

**A6. `CLAUDE.md`**, under "Branches and deploys", add one rule:

> **Specs from chat** arrive as untracked files in the main checkout's `specs/`. The session that implements a spec copies it into its own folder and commits it on its branch. After the merge, it removes the untracked copy from the main checkout (only if `origin/main` holds an identical copy) and fast-forwards the main checkout. The main checkout holds no other work.

## Part B: docs

**B1. The project overview.** Replace `specs/PROJECT-OVERVIEW.md` with `specs/docs-refresh/PROJECT-OVERVIEW.md` as it is, then remove `specs/docs-refresh/`. Before committing, check every fact in it against the code, `FEATURES.md` and `NOTES.md`. Where it disagrees with the code, the code wins: correct the line and list each correction in the report.

**B2. Archive finished specs.** `git mv` every spec of a finished step into `specs/archive/`, names unchanged. Stay in `specs/`: `PROJECT-OVERVIEW.md`, this file, `public-api-and-package.md`, and any spec whose branch is not merged yet. Add `specs/archive/README.md`, one paragraph: "Specs of finished steps, kept as history. The code, `FEATURES.md` and `NOTES.md` are the current truth." Update every link to a moved spec in `NOTES.md`, `FEATURES.md`, `README.md` and `CLAUDE.md`. The history archive in B4 keeps its old paths as written; add one line at its top saying the specs now live in `specs/archive/`.

**B3. The stale API spec.** Add this block at the top of `specs/public-api-and-package.md`, and change nothing else in it:

> **Superseded (22 Nov 2026). Do not run this file.** Frame links have since shipped in the `#t=<seconds>&tc=<timecode>` format, so section 2's note on the link format is out of date, and the delivery steps predate the branch rules in `CLAUDE.md`. The work is split into two new specs, API 0.1 step A (names and public surface) and step B (library build and package). They reuse section 1 (naming rules) and section 2 (the rename map) from this file.

**B4. Split `NOTES.md`.**

1. `git mv NOTES.md docs/history/NOTES-2026-11.md`, so its history follows it. Add one line at the top: "The build log from step 1 to frame links (15–22 Nov 2026), kept as written. The current state is in `NOTES.md`." Nothing else in it changes.
2. Write a new `NOTES.md`, **at most 250 lines**, with these sections:

| Section | Holds |
| --- | --- |
| About this file | It is the current state, kept short. A session updates the section its change affects and replaces any line its change makes untrue; it adds one line to Log. Reports and step detail stay out; the build log until 22 Nov is in `docs/history/` |
| Versions | Today's versions, from `package.json` and the lockfile |
| URLs and deploys | Canonical URL, secondary domain, the pages (`/`, `/preview.html`, `/embed.html`, `/workbench.html`) and their parameters, Vercel's preview protection, the deploy guard. Point to `CLAUDE.md` for the rules |
| Architecture | One short paragraph each, with file paths: how the Viewer, the pro runtime and the Studio JS and CSS load; where pro state lives; the frame clock (`requestVideoFrameCallback`, the fallback, Firefox reporting the seek time); the range engine (`playbackDecision`, how it tells its own seeks from the user's); frame links (`logic.ts`, Video.js doesn't read the page URL); guides geometry; zoom and the rendition cap |
| Video.js APIs we rely on | One deduplicated list from the archive's "Verified APIs" sections, with the version they were checked against |
| Decisions | The archive's "Decisions" section, plus decisions in step sections that still hold. Drop a decision that a later one replaced, or mark it "replaced by …" |
| Checks | How to run typecheck, tests, build, the contrast script and the browser checks; one line per script in `scripts/browser-checks/`; the known failures and flaky checks with their cause (WebKit clipboard in `configurator.js`, `zoom-rendition-note.js` in Firefox and Chromium, `dock-polish.js` in forced colours, the CDP drag in `phone-transport.js`, the landing hero's staged state) |
| Bundle sizes | The latest measured table only, with its date |
| Unverified | **One** list of what is still unverified today, deduplicated, one line per item, grouped by area (browsers, devices and assistive tech, playback, links, layout). Drop an item that a later section resolved |
| Log | One line per step or merged branch, step 1 to frame links: date, name, merge commit where known |

Rules for the split:
- **Nothing is lost:** everything that leaves `NOTES.md` is in the archive, word for word.
- Every statement in the new file must come from the archive or the code. Where the archive contradicts itself, the later section wins. Where you can't tell, put the question under Unverified.
- `NOTES.md` is shared with other sessions. The author authorises this one-time rewrite. If `origin/main` gains `NOTES.md` lines from another session before you merge, merge `origin/main` into your branch: their lines go word for word into the archive, and their substance into the right sections of the new file. Report it.

**B5. `CLAUDE.md`.**
- After the opening sentence, add: "`NOTES.md` is the current state and stays short: update the section your change affects and add one line to its Log. The full build log until 22 Nov 2026 is in `docs/history/`."
- In "Hard rules", add: "8. **The embed page is in use.** artmarchuk.me embeds `/embed.html` in an iframe. Any change that touches `apps/preview/embed.html`, `apps/preview/src/embed/` or anything the embed loads is checked inside a cross-origin iframe (playback, fullscreen, Copy link) and called out in the report."
- In "Where things live", add `docs/history/` and `specs/archive/`.

**B6. One stale example in `FEATURES.md`.** The landing row's "How to try" uses `/#t=00:00:27:15`, the old link format. Replace it with the link the skin copies today on that frame (take it from Copy link in the browser, don't compute it by hand). Old links still open; a note isn't needed.

## Verification

- `npm run typecheck`, `npm test` and `npm run build` pass. The build output is the same before and after: compare a listing of the `dist/` file names and hashes.
- No broken links: every relative link in the `.md` files outside `docs/history/` resolves (a small script or `grep` plus `ls`; say which).
- The new `NOTES.md` has 250 lines or fewer. The archive is the old `NOTES.md` plus its header lines (`diff`).
- `git grep -n "specs/step-"` outside `docs/history/` and `specs/archive/` finds nothing that points at a missing file.
- Merge as `CLAUDE.md` says, and deploy a preview with `npm run preview:vercel`. **No production deploy:** nothing the site serves changes. The author may ask for one later.
- Clean up your own folder and branch afterwards (`CLAUDE.md` rule 8), then do A5.

## Report

1. Part A: what was pruned and deleted (worktrees, local and remote branches), what was kept and why, the main checkout's final `git status`.
2. Part B: one line per item. List every correction you made to the new overview, with the source that settled it.
3. Line counts: the old `NOTES.md`, the new one, the archive.
4. Anything you stopped on (section 0), and what you could not verify.
5. The merge commit and the preview URL.
