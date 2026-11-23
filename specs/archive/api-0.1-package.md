# API 0.1, step B: the library build and the npm package

Frameline becomes installable: `npm install <package>`, one import, and a host that uses only the Viewer downloads no Studio code or CSS. This step also settles the dependency ranges and measures the Viewer's weight against a stock Video.js skin. **Don't publish:** the author runs `npm publish` himself.

Read first: `CLAUDE.md`, `specs/PROJECT-OVERVIEW.md`, `NOTES.md`, `README.md`, `specs/api-0.1-names.md` (step A, merged), `src/pro/index.ts`, `vite.config.ts`, `package.json`.

The repo is public: commit messages, comments and docs are written for an outside reader.

## Delivery

Start only when step A (`api-names`) is in `origin/main`. Work on a new branch, `package`, in your own folder. Merge as `CLAUDE.md` says once everything below passes. Deploy production only if the author asks: the site's pages shouldn't change in this step (see Verification).

## What we know before starting

From the code at step A (8e901c6). Check each fact again before relying on it:

- **The split already exists in the source.** `src/pro/frameline-skin.tsx` lazy-loads `./runtime`, which lazy-loads `../studio` and `../debug`. The CSS follows the JS: `src/video/skin.tsx` imports the tokens, base and skin CSS; the Studio, guides, timeline and debug modules import their own CSS. The package must keep this split: **one chunk boundary, one CSS boundary, the same as in the source.**
- **Runtime imports from outside `src/`:** `react`, `react-dom`, `@videojs/react` (with subpaths under `ui/`), `@videojs/core/i18n/…`, `@videojs/utils/time`, and `cn` (two imports). Nothing else.
- **`@/` path imports:** ten files in `src/` import through the `@/` alias. TypeScript doesn't rewrite paths in declaration files, so these would break the published types.
- **`process.env.NODE_ENV`** in `src/pro/dev.ts` gates the development warnings. It must stay in the output unreplaced, for the host's bundler to replace.
- **`'use client'`** heads `src/pro/frameline-skin.tsx` and `src/video/skin.tsx`, for React Server Components hosts such as Next.js. Bundlers often drop module-level directives.
- **`react`** is a regular dependency today, and `cn` is a runtime dependency with a caret range.
- TypeScript is 7.0.2 and Vite is 8.3.x (Rolldown). Check their library and declaration options against the installed versions, not against blog posts.

## 1. Source preparation

1. Replace the `@/` imports inside `src/` with relative imports. The site (`apps/`) keeps using `@/` to reach the skin. No behaviour change: the site's `dist/` must stay identical, apart from possible chunk hash churn, and the report says which.
2. Nothing in `src/` may import from `apps/` or from a devDependency at runtime. Check it (`git grep`, or a lint rule if one is already set up) and report.

## 2. The library build

- `npm run build:lib` builds the package into `lib/` (git-ignored); `npm run build` keeps building the site into `dist/`. Use a second Vite config in library mode, or another tool already in the repo. Don't add a new build tool unless Vite can't meet a requirement below, and if you do, say why.
- **ESM only**, target ES2022, with the browser floor unchanged. No CommonJS build.
- **External:** `react`, `react-dom`, `react/jsx-runtime`, and every `@videojs/*` import with its subpaths. `cn` is either bundled or a dependency (section 4): pick one and say why.
- **Chunks:** the Viewer entry, the pro runtime, Studio and the debug readout stay separate chunks, loaded with dynamic `import()` as in the source.
- **CSS:** each chunk brings its own CSS, so the Viewer path loads no Studio CSS. Choose the mechanism and say why in `NOTES.md`. The preferred one mirrors the source: each JS chunk imports its own `.css` file, which every common bundler handles. If that can't be made to work, the fallback is one documented import for the Viewer CSS plus the Studio CSS loaded by its chunk. Either way:
  - the Viewer path requests no Studio CSS;
  - a host needs at most one documented CSS import;
  - nothing injects `<style>` tags at runtime (that breaks strict Content Security Policies).
- **Types:** `.d.ts` files for the public entry, generated from the source, with no `@/` paths and no `src/` paths. Type-check them in the consumer app (section 5).
- **`'use client'`** survives at the top of the entry chunk, and of any other chunk that needs it. Check the output and report.
- **`process.env.NODE_ENV`** stays in the output unreplaced.
- **No source maps in the package** for 0.1.0, unless they come free and small; report the size if you include them.

## 3. `package.json`

- **Name:** `videojs-frameline` if `npm view videojs-frameline` shows it is free, otherwise `@artmarchuk/videojs-frameline`. Report which. The README and the snippets on the landing page's Configure panel use the name chosen.
- `version` `0.1.0`. Remove `"private": true`. Fill in `description` ("A Video.js v10 skin for video creators: a clean Viewer and a Studio monitor with frame-accurate transport, timecode, guides and zoom."), `repository`, `homepage`, `bugs`, `keywords`, `license` and `author` ("Artem Marchuk").
- `exports` (the entry, its types, and the CSS file if section 2's fallback needs one), `types`, `files` (only `lib/`, `README.md`, `LICENSE`, `THIRD_PARTY_NOTICES.md`, `CHANGELOG.md`), and `sideEffects: ["**/*.css"]`.
- The site keeps building from source: the package fields must not change what `npm run dev` and `npm run build` do.

## 4. Dependency ranges

Two different things, both decided here:

- **Peer ranges** tell a host which versions it may install next to Frameline. They cover what is tested and nothing more:
  - `react` and `react-dom`: `^19.3.0`.
  - `@videojs/react`, `@videojs/core`, `@videojs/utils`: `~10.4.0` (patch releases only). Video.js 10 has renamed public things between minor versions (for example "Minimal" became "Neutral"), so a minor release is not assumed safe. The "Follow Video.js releases" task widens the range after testing.
- **The repo's own pins:** every dependency and devDependency gets an exact version, the one the lockfile resolves today. `react` and `react-dom` move to `peerDependencies`, and stay in `devDependencies` for the site. The lockfile stays committed. This replaces the rule "only `@videojs/*` is pinned" in `NOTES.md` and `CLAUDE.md`; update both.
- **The latest Video.js:** run `npm view @videojs/react version` and report it. If it is newer than 10.4.0, don't upgrade in this step: report what changed (from the package's changelog) and add a line to the report's backlog proposals.
- **`cn`:** if it stays a dependency, give it a caret range (a dependency, not a peer).
- The Vercel CLI version in the deploy scripts: check it against the current major (`npm view vercel version`) and update the pin if it is behind, in its own commit.

## 5. The consumer check

A rerunnable script, `npm run check:consumer` (in `scripts/consumer/`), that tests the package the way a host would use it:

1. `npm run build:lib` and `npm pack` into a temp folder outside the repo.
2. A new Vite + React app in a temp folder outside the repo, made from a template kept in `scripts/consumer/` (not with a generator, so the run doesn't depend on a generator's version). It installs the tarball and the peers at the tested versions.
3. Its source imports only from the package name: no `src/` path, no alias. It type-checks with `tsc` against the published types.
4. Three pages, built for production and served:
   - **`viewer`:** `FramelineSkin tier="viewer"` with the reel.
   - **`studio`:** `tier="studio"`, plus a `linkUrl` switch from the query: none, a string base URL, a function returning a URL, a function returning `null`.
   - **`stock`:** the stock Video.js skin with the same media and the same player setup. Find the stock skin in the installed `@videojs/react` (its docs under `node_modules/@videojs/react/docs/`), and name it in the report. Don't guess an export name.
5. Playwright, in Chromium, Firefox and WebKit:
   - **Viewer:** no request for the pro runtime, Studio JS or Studio CSS; the controls are styled (a computed style from `skin.css`, such as the bar's background, not the browser default); play, pause and seek work.
   - **Studio:** the dock renders (its background is `#171717`), `.` steps a frame, `G` opens Guides, the timecode changes.
   - **linkUrl** (Chromium clipboard): the default copies the page URL plus the position; the string copies `<base>#t=…&tc=…`; the function's URL is copied as returned; with `null`, nothing is copied, there is no check on the link button, nothing is announced (the live region's text is unchanged) and `onCopyLink` doesn't fire (the page counts events).
6. **Weight:** report, for `viewer`, `studio` and `stock`, the JS and CSS loaded before the first frame plays (raw and gzip -9, and request counts), measured from Playwright's network log, not from file sizes. Then report Frameline Viewer minus stock, the number the claim rests on. Also break down the shared engine chunk that the site's notes leave unexplained (what is in it, and whether a Viewer host can avoid it).

## 6. The Viewer weight claim

Today the README and FEATURES say the Viewer is "as light as a stock skin". Compare it with the number from 5.6:
- if Frameline's Viewer adds at most about 10% gzip JS and CSS over stock, keep the claim and add the numbers next to it;
- if it adds more, replace the claim with the measured numbers. Report it, and propose (don't build) what would bring it down.

## 7. README and CHANGELOG

- **Install**, at the top of the README: `npm install <package>`, the peers with their ranges, the CSS import if section 2 needs one, and a minimal example that imports from the package name. Viewer and Studio, five lines each. No `@/` path anywhere in the README.
- The section "copy `src/` into your app" goes away.
- **Versioning:** "0.x: a breaking change bumps the minor version and is listed in CHANGELOG.md. Peer ranges cover only tested versions."
- `CHANGELOG.md` with a 0.1.0 entry: the first public release, the API (pointing at the README's reference), the peer ranges, and what isn't there yet (HTML build, i18n).
- `NOTES.md`: the build, the CSS mechanism and why, the pins rule, the consumer check, one Log line. `FEATURES.md`: the install row.

## Verification

- Typecheck, unit tests, `build`, `build:lib`, the contrast script and `check:consumer` pass.
- **The site is unchanged:** compare the `dist/` file list and hashes before and after; explain any difference.
- Every browser check passes in Chromium on the local build; Firefox and WebKit match the known failures in `NOTES.md`. `embed-link.js` passes (hard rule 8: the relative imports touch files the embed loads).
- `npm pack --dry-run`: the file list holds only what section 3 names. Report the tarball size.
- `lib/` contains no `@/`, no `src/`, no `apps/`, no `localhost` and no absolute paths of this machine (`grep`).
- Screenshots, opened and looked at: the consumer app's `viewer` and `studio` pages.
- Merge as `CLAUDE.md` says and deploy a preview. Production only if the author asks.

## Report

1. The package name, the `npm pack` file list and the tarball size.
2. One line per section, and anything that differs from this spec, with the reason.
3. The CSS mechanism, and why.
4. The weight table (5.6), the verdict on the claim (6), and what is in the engine chunk.
5. The peer ranges, the pins, the latest Video.js version and the Vercel CLI version.
6. The merge commit and the preview URL.
7. **The exact commands for the author to publish and tag** (`npm login` if needed, `npm publish --access public` for a scoped name, `git tag v0.1.0`, `git push origin v0.1.0`), and what to check on npmjs.com afterwards.
8. What you could not verify (for example Next.js or webpack hosts), and backlog proposals.
