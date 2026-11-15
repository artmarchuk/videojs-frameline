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

## Commands

| Task | Command |
| --- | --- |
| Workbench (local preview) | `npm run dev` (http://localhost:5173) |
| Typecheck | `npm run typecheck` |
| Build | `npm run build` (output in `dist/`) |
| Deploy | `npm run deploy vercel` (production; fallback `npm run deploy netlify`) |

## Where things live

- `src/`: the skin. `src/video/skin.tsx` is the entry point.
- `apps/preview/`: the site. `index.html` and `src/page/` are the configurator page (the site root, the submission URL); `preview.html` and `src/frame/` the monitor page; `workbench.html` and `src/shell/` the CLI's workbench, which you don't change. `src/frame/media.ts` is the one place that names the demo media.
- `FEATURES.md`: every feature, and where to try it. No version or step labels (no "Since" column) until deploys and announcements are organised. Update it in every step.
- `specs/`: the project overview and per-step requirements.
- `NOTES.md`: versions, deployed URL, decisions, Backlog, Unverified.
