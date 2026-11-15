# Step 1 of 9: Environment and pipeline

Project: **Video.js PRO**, a skin for the Video.js v10 player, built for the Video.js Skins Design Challenge. Submission deadline: Monday 17 Nov 2026, 09:59 Nicosia time (Sunday 16 Nov, 11:59 pm PST). Today is Sunday 15 Nov 2026.

## Product context (read first)

Video.js PRO is a player skin for **video creators**: the tools people use to make video (web editors, AI video generators, review and approval platforms). It gives those tools a professional preview monitor with frame-accurate transport, timecode, in/out loops, safe areas, platform crop guides, frame grabs and channel views. One skin has three tiers:

- **Share**: the clean player a creator's client or audience gets.
- **Review**: feedback and editing features (timecode, frame step, in/out, markers, guides).
- **Studio**: image inspection (channels, gain/gamma, zoom).

Later steps build all of this. **This step builds none of it.** This step makes sure that everything built later can be started, previewed and deployed in one command, so the entry is always submittable.

## Goal

An empty but working Video.js v10 skin project, tracked in git, with the Video.js skill installed in Claude Code, a project guide in `CLAUDE.md`, and the untouched skin deployed at a public URL that plays video.

## Out of scope

Do not restyle anything, add controls, add pro features, write tokens or icons, or change the scaffolded skin beyond what is needed to build and deploy. If you find something worth doing later, add it to `NOTES.md` instead.

## Hard rules for this whole project

1. **Never invent Video.js APIs.** Check component names, props, CSS variables and file paths against the installed package and the official docs before using them. The docs are published as `llms.txt` and `llms-full.txt` (also inside the installed package under `node_modules/@videojs/react/docs/`). Docs pages and old blog posts show names that changed during the beta, such as "Minimal" (now "Neutral") and an "eject" flow (now Shadcn); the installed version wins.
2. **Use Video.js v10 only**, not v8 (`video.js` on npm still resolves to v8). Packages are `@videojs/react` and `@videojs/html`.
3. **Browser floor:** Chrome and Edge 111, Firefox 121, Safari and iOS 16.4. Do not use features beyond it without a fallback.
4. **Pin versions.** No `^` or `~` on Video.js packages; use exact versions and commit the lockfile.
5. **Tell me what you could not verify**, instead of guessing.

## Requirements

### 1.1 Check the machine

- Verify Node.js and npm versions meet what the Video.js CLI and docs require; if Node is missing or too old, stop and tell me what to install.
- Verify `git` is available and confirm the working directory I started you in.
- Check that I'm logged in to the host I'll deploy to (Vercel by default). If not, stop and give me the exact login step.

### 1.2 Install the Video.js skill

- Follow the **AI quickstart prompt** in the Build with AI guide (`https://videojs.org/docs/framework/html/guides/build-with-ai`) to install the Video.js skill for Claude Code. If the guide's command differs from `npx @videojs/cli agents skills`, use the guide's.
- Confirm the skill is installed, and say whether a new session is needed for it to load.

### 1.3 Create the skin project

- Run the CLI: `npx @videojs/cli skin create`, with these choices:
  - Framework: **React**
  - Styling: **plain CSS** (no Tailwind)
  - Starting skin: **Scaffold**
  - Preset: **video**
- If the CLI offers different or extra options, pick the closest to the above and list what you chose.
- Name the project `videojs-pro`. TypeScript on, if offered.
- Make sure the preview workbench runs locally with one command (record it as the `dev` command in the README). The workbench should let me test player sizes, aspect ratios, light/dark, RTL, languages and autoplay/loop.

### 1.4 Git

- Initialise a repository, add a `.gitignore` suited to the project (`node_modules`, build output, env files, deploy folders), make the first commit of the untouched scaffold, then commit again after each requirement below that changes files.
- Commit messages: short and imperative. End each with the attribution lines from your session instructions.

### 1.5 Pin and record versions

- Pin every `@videojs/*` package to the exact installed version.
- Record in `NOTES.md`: Node version, package manager, each `@videojs/*` package with its version, and the CLI version used.
- Note any mismatch between the docs site version and the installed one.

### 1.6 Placeholder media

- Use the default demo source the scaffold or workbench already provides, or another Mux sample stream that the official docs list. **Do not invent a Mux playback ID.**
- Put the source in one named place (a single config or constants file), because step 8 replaces it with our own video.
- Check that the video plays with sound, shows captions if the source has them, and reaches fullscreen.

### 1.7 Deploy

- Deploy the untouched skin using the project's own deploy command (`npm run deploy` according to the challenge guidelines) to Vercel, or Netlify if Vercel fails.
- Result: a **public URL, no login**, that loads the player and plays video.
- Open the URL in a clean (not signed-in) browser session and confirm it plays; if you can't test a mobile viewport, say so.
- Record the URL, the deploy command and the host in the README.

### 1.8 Project guide files

Create these at the repository root:

- **`CLAUDE.md`**: the product context above (what Video.js PRO is, the three tiers, the creator focus), the hard rules above, the commands (`dev`, build, deploy), and this rule: *every later step starts by reading Backlog list in `NOTES.md` and the step's requirements file; every step ends deployed.*
- **`README.md`**: what the project is in two sentences, how to run it, how to deploy it, and the live URL.
- **`NOTES.md`**: versions (from 1.5), the deployed URL, a "Decisions" list, a "Backlog" list for things you noticed but did not do, and an "Unverified" list.

## Acceptance criteria

All of these are true when you report back:

- [ ] `git log` shows a clean history and no uncommitted changes.
- [ ] The local preview workbench starts with one documented command.
- [ ] A public URL loads without login and plays video, tested in a clean browser session.
- [ ] No `video.js` (v8) dependency anywhere; Video.js packages are pinned to exact versions.
- [ ] The Video.js skill is installed, and you can name where.
- [ ] `CLAUDE.md`, `README.md` and `NOTES.md` exist and match the above.
- [ ] No styling, controls or features were added.

## Report back (keep it short)

1. The public URL.
2. The commands: dev, build, deploy.
3. Versions pinned (Node, each `@videojs/*` package, CLI).
4. What you chose in the CLI, and anything that differed from the options above.
5. Anything unverified, any warnings during install or build, and anything that will affect step 2 (Skin foundation and Share tier).
