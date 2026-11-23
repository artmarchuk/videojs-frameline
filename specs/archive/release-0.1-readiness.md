# 0.1.0 readiness: Video.js 10.6, the Node version, no `cn`

Three fixes the package needs before its first publish. The step B report found that:
- the peer range `~10.4.0` conflicts with the current Video.js (10.6.0);
- `engines.node: 24.x` would make npm warn every host on another Node version;
- `cn`, a Tailwind class merger the skin doesn't need, makes up most of the Viewer's weight over the stock skin.

No new features and no visible change. **Don't publish:** the author runs `npm publish` after this step, and after CI and CSS isolation.

Read first: `CLAUDE.md`, `specs/PROJECT-OVERVIEW.md`, `NOTES.md`, `README.md` (Install, Versioning, Weight), `CHANGELOG.md`, `package.json`, `vite.lib.config.ts`, `scripts/consumer/`.

The repo is public: commit messages, comments and docs are written for an outside reader.

## Delivery

Work on a new branch, `release-readiness`, in your own folder. Merge as `CLAUDE.md` says once everything below passes. This step changes what the site serves (a new Video.js, no `cn`), so the embed on artmarchuk.me will change at the next production deploy. Deploy production only when the author asks, and then run the live checks at the end of this spec.

## 0. Before you start

1. **The embed check after step A.** Step A reached production on 23 Nov. If `NOTES.md` has no record of a check on https://artmarchuk.me/videojs-frameline-skin.html since then, do it first, against production: playback, a few frame steps, Copy link, and the copied link opening that frame. Record the result in `NOTES.md`.
2. **Loose ends from step B:**
   - move `specs/api-0.1-package.md` to `specs/archive/`;
   - prune the `package` worktree if git lists it as prunable;
   - delete the `package` branch, locally and on GitHub, if it is fully in `origin/main` (`CLAUDE.md` rule 8 checks).

## 1. Video.js 10.6

1. Read what changed in `@videojs/react`, `@videojs/core`, `@videojs/utils` and `@videojs/mux-video` from 10.4.0 to the latest 10.x. Use the packages' own changelogs or the GitHub releases; open the pages, don't rely on summaries. List every change that touches something the skin uses, above all the new `exports` entries for nested subpaths.
2. Upgrade every `@videojs/*` package in the repo to the latest 10.x, pinned exactly. Check that the transitive `@videojs/*` packages and the `video.js` pointer package resolve to the same version (`npm ls`).
3. Check each `@videojs/*` import in `src/` against the new `exports` maps: every subpath the skin imports (`@videojs/react/ui/…`, `@videojs/core/i18n/…`, `@videojs/utils/time`) must be a documented export. If one is no longer exported, use the documented path, and list each change.
4. Run everything (Verification below) on the new version. The Viewer's DOM comparison in `viewer-gate.js` (tags, classes and roles) shows what Video.js changed in the markup; report any difference.
5. **The peer range covers what passed, and no more.** Run `check:consumer` twice: with the peers at 10.4.0, then at the latest 10.x. Make the consumer template's Video.js version a parameter for this, kept for later use. If both pass, the range is `>=10.4.0 <10.7.0` for the three peers. That's tested at both ends, and it is honest about the next minor not being tested. If 10.4.0 fails, the range starts at the lowest version that passes; report why.

## 2. The Node version

`engines.node` is `24.x` only because Vercel reads it to choose its build's Node version. The package itself runs in the browser, and hosts must not get Node warnings from it.

1. Check in Vercel's current docs how a project's Node.js version is chosen: the project setting, `engines.node`, or both, and which wins. Open the docs page and cite it in `NOTES.md`.
2. Make production keep building on Node 24, with `engines` no longer warning hosts on Node 20, 22, 24 or 26:
   - If the Node version can be set in a committed file or through the Vercel CLI, do that.
   - If it needs the project's settings on vercel.com, **stop before changing `engines`.** Tell the author the exact setting to change, wait for his confirmation, then continue.
   - Then set `engines` to the range the repo's own tooling actually needs (Vite 8's minimum, checked in its `package.json`), or remove it, and say which.
3. Deploy a preview and confirm in its build log that it built on Node 24.

## 3. Drop `cn`

`src/lib/resolve-class-name.ts` builds `cn` with `createCn` and a `mediaTheme` taken from the scaffold's Tailwind theme. The skin is plain CSS, and every `cn(...)` call in `src/` joins fixed class names, plus at most one `className` from a caller.

1. Replace `cn` with a small local function that joins its truthy string arguments with single spaces, and accepts the same argument shapes as the calls in `src/` use. Keep `resolveClassName` and its `ClassName` type, typed without `cn`'s `ClassValue`.
2. Remove `mediaTheme`, its test, and `cn` from `package.json` and the lockfile. `git grep` finds no `cn/` import and no `createCn` afterwards.
3. **The markup must not change.** Every element's tag, classes and role must be identical before and after, in the Viewer and in Studio, in the states `viewer-gate.js` and `dock-polish.js` visit. Use the DOM comparison these checks already have, and extend it to Studio if it covers only the Viewer.
4. **One change for hosts**, recorded in `CHANGELOG.md`: a `className` passed to the skin is now added beside the skin's own classes, with no Tailwind-style merging of conflicting utility classes. Before 0.1.0, nobody depends on it.
5. Re-measure the weight with `check:consumer` (section 1.5 runs it anyway), and update the README's Weight table and `FEATURES.md`.

## 4. Docs

- `README.md`: Install (the peer ranges), Weight (the new numbers), and nothing else.
- `CHANGELOG.md`, under 0.1.0 (still unreleased): the peer range, the Node version, and the `className` note.
- `NOTES.md`: versions, the Node version setup with its source, the consumer check's Video.js parameter, one Log line. `FEATURES.md`: the weight.

## Verification

- Typecheck, unit tests, `build`, `build:lib`, the contrast script, and `check:consumer` at both Video.js versions pass.
- Every browser check passes in Chromium on the local build; Firefox and WebKit match the known failures in `NOTES.md`. Report anything new.
- `embed-link.js` passes in all three engines (hard rule 8: the embed loads Video.js and the skin).
- The DOM comparison from 3.3 is identical, or every difference is explained as coming from Video.js (1.4).
- `npm pack --dry-run`: the same file list as step B, apart from the changes this step makes. Report the tarball size.
- Merge and deploy a preview. No production deploy unless the author asks.

**When the author asks for production:** deploy from a clean checkout of `origin/main`, then check against the live site:
- `viewer-gate.js`, `link-open.js` and `embed-link.js` pass;
- https://artmarchuk.me/videojs-frameline-skin.html plays, steps frames, and its copied link opens the frame;
- the landing page's staged hero shows (00:00:03:02, range and guides).

## Report

1. Section 0: the artmarchuk.me check result, and the loose ends.
2. The Video.js changes that touch the skin, the import paths you changed, and the DOM differences.
3. The peer range, and the two consumer runs.
4. The Node version: how Vercel chooses it (with the source), what you changed, whether the author had to change a setting, and the preview's build log line.
5. `cn`: the DOM comparison result, and the weight table before and after.
6. The merge commit, the preview URL, and the tarball size.
7. What you could not verify, and backlog proposals.
