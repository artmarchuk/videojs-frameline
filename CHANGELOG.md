# Changelog

Frameline follows [semantic versioning](https://semver.org) with the 0.x rule: a breaking change bumps the minor
version and is listed here. Peer ranges cover only the versions that were tested.

## 0.1.0 (unreleased)

The first public release.

- **What it is:** `FramelineSkin`, a skin for the Video.js v10 React player with two tiers: `viewer`, the clean player
  a creator's client or audience gets, and `studio`, the creator's monitor (ruler timeline with In and Out, frame
  step, timecode, markers and cuts, guides and platform zones, grab frame, links to a frame, zoom). Feature flags
  switch single features on over Viewer or off over Studio.
- **The API:** props, events, the `apiRef` handle, feature flags and public tokens, all documented in the
  [README](README.md#api-conventions), whose names follow one rule (README, "API conventions"). Every exported type
  starts with `Frameline`.
- **Loading:** the Viewer loads no Studio code or CSS. The pro runtime, the Studio layer and the debug readout are
  separate chunks loaded with `import()`, and each brings its own stylesheet. There is no CSS to import.
- **The package:** ESM only (ES2022), type declarations included, `'use client'` on the entry.
- **Peers:** `react` and `react-dom` `^19.3.0`; `@videojs/react`, `@videojs/core` and `@videojs/utils` `~10.4.0`.
  One dependency: `cn` `^0.4.0`.

Not there yet: a build for `@videojs/html` (HTML custom elements), and translations of the skin's own strings
(English only; Video.js's own components follow the player's locale).
