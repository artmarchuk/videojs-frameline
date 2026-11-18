@AGENTS.md

# Frameline

**Every later step starts by reading `specs/PROJECT-OVERVIEW.md`, `NOTES.md` and that step's requirements file in `specs/`. Every step ends deployed, with a working public URL.**

## What this is

Frameline is a player skin for the Video.js v10 player, made for **video creators**. It is for the tools people use to make video: web editors, AI video generators, and review and approval platforms. It gives those tools a professional preview monitor with frame-accurate transport, timecode, in/out loops, safe areas, platform crop guides, frame grabs and zoom. It is built for the Video.js Skins Design Challenge (deadline Monday 17 Nov 2026, 09:59 Nicosia time).

One skin, two tiers:

- **Viewer**: the clean player a creator's client or audience gets. It ships no pro code.
- **Studio**: the creator's monitor: dock below the picture, ruler timeline with In/Out handles, frame-accurate transport, timecode, markers, capture, guides and zoom to check detail.

Finer control comes from feature flags: a host turns a single feature on over Viewer or off over Studio.

Test for every decision: does it help someone make, check, review or deliver a video? If it only helps someone watch, it belongs in Viewer or it is cut.

## Hard rules

1. **Never invent Video.js APIs.** Check component names, props, CSS variables and file paths against the installed package and the official docs before using them. Docs: `node_modules/@videojs/react/docs/llms.txt`, https://videojs.org/docs/framework/react/llms.txt, https://videojs.org/llms.txt. The installed version wins over docs pages and blog posts (for example "Minimal" is now "Neutral", and the "eject" flow is now Shadcn).
2. **Video.js v10 only** (`@videojs/react`, `@videojs/html`), never v8. Pin `@videojs/*` versions exactly (no `^` or `~`) and commit the lockfile. The `video.js@10.x` package that `@videojs/core` depends on is the v10 pointer package, not v8.
3. **Browser floor:** Chrome and Edge 111, Firefox 121, Safari and iOS 16.4. Nothing beyond it without a fallback.
4. **Accessibility:** WCAG 2.2 AA. See `specs/PROJECT-OVERVIEW.md` for targets, contrast and overlay rules.
5. **Frame accuracy is best effort.** Never claim guaranteed frame accuracy or true reverse playback.
6. **Say what you could not verify** instead of guessing; list it in `NOTES.md` under "Unverified".
7. **Do not build anything marked [Backlog].** Put ideas in `NOTES.md` under "Backlog".

## Branches and deploys

Several sessions work on this project at the same time (the player theme, the landing page), each in its own folder. A deploy builds the files of the folder it runs in, so a deploy from a feature folder takes the other sessions' work off the live site. This has happened. The rules:

1. **Work on your own branch, in your own folder** (a git worktree). Never commit to `main` directly, and never touch another session's folder or its uncommitted files.
2. **To merge:** `git fetch`, merge `origin/main` into your branch, run typecheck, tests and build, then push the branch to `main` as a fast-forward (`git push origin <branch>:main`). If the push is rejected, `main` has moved: fetch, merge and check again. Never force-push `main`.
3. **Production is deployed only from a clean checkout of `origin/main`,** after the merge, and only when the author asks for a production deploy. `npm run deploy vercel` refuses anything else (`apps/preview/deploy-guard.mjs`). Do not go round the guard with a bare `vercel` command.
4. **A feature branch gets a preview:** `npm run preview:vercel`. It never changes the live site.
5. **After a deploy, check the live site** for the other workstream's latest work as well as your own, and say what you checked.
6. **`NOTES.md` is shared.** Add your own sections and lines; do not rewrite another session's. Commit only your own lines: if the file holds someone else's uncommitted change, leave that change uncommitted.
7. **The landing page's screenshots show the player.** After a theme change reaches `main`, they are stale until the landing session re-shoots them; say so in the report.

"Every step ends deployed" (above) means: a preview for a branch, production once it is merged and the author asks.

## Commands

| Task | Command |
| --- | --- |
| Workbench (local preview) | `npm run dev` (http://localhost:5173) |
| Typecheck | `npm run typecheck` |
| Build | `npm run build` (output in `dist/`) |
| Preview deploy (any branch) | `npm run preview:vercel` |
| Production deploy | `npm run deploy vercel`, only from a clean checkout of `origin/main` (fallback `npm run deploy netlify`) |

## Where things live

- `src/`: the skin. `src/video/skin.tsx` is the entry point.
- `apps/preview/`: the site. `index.html` and `src/page/` are the landing page with the configurator (the site root, the submission URL); `src/page/tokens.css` mirrors the Figma variables one to one and `landing.css` uses only those tokens; `preview.html` and `src/frame/` the monitor page; `workbench.html` and `src/shell/` the CLI's workbench, which you don't change. `src/frame/media.ts` is the one place that names the demo media.
- `FEATURES.md`: every feature, and where to try it. No version or step labels (no "Since" column) until deploys and announcements are organised. Update it in every step.
- `specs/`: the project overview and per-step requirements.
- `NOTES.md`: versions, deployed URL, decisions, Backlog, Unverified.
