# Frame links: seconds for every tool, timecode for the exact frame

A copied link to a frame now carries two keys in the URL fragment: `t`, the position in seconds as the W3C Media Fragments spec defines it, and `tc`, the timecode on screen. Any tool that understands seconds opens the right second; Frameline opens the exact frame. Links in today's format (`#t=HH:MM:SS:FF`) keep opening.

Read first: `specs/PROJECT-OVERVIEW.md`, `NOTES.md`, `FEATURES.md`, the README section "Links to a frame", and `src/pro/studio/logic.ts` (`withLinkPosition`, `readLinkPosition`, `formatLinkPosition`, `parseLinkPosition`) with its tests.

The repo is public: commits, comments and docs describe the change for an outside reader. Follow "Branches and deploys" in `CLAUDE.md`.

**Scope.** The link format, reading and writing. No UI change, no new prop, no new event, no new shortcut. Ranges in links are not part of this change.

---

## 1. Why this format

- Media Fragments URI 1.0 defines the time key `t` in seconds only (`t=62.104`, `t=npt:62.104`, `t=0:01:02.104`). Browsers implement only seconds. Today's `#t=HH:MM:SS:FF` gives `t` a meaning no other tool reads.
- Seconds can't name a frame exactly, so the timecode travels beside them under its own key. The spec says players must ignore keys they don't know, so `tc` is safe to add.
- Video platforms (YouTube, Vimeo, Wistia, Loom) also link with seconds. No tool puts a timecode in a public URL, so there is no existing timecode format to follow.

Put a short version of this in `NOTES.md` under Decisions.

## 2. Writing a link

Copy link (the link button, `S`, the More menu item) writes:

```
#t=<seconds>&tc=<timecode>
```

- **`t`:** the middle of the current frame, in seconds from the start of the media: `(frame + 0.5) / rate`, using the exact rate (`30000/1001` for 29.97), rounded to three decimals and written without trailing zeros. The middle, not the start: at 24 fps frame 1490 starts at 62.0833 s, which rounds to `62.083` and reads back as frame 1489; its middle, `62.104`, reads back as 1490.
- **`tc`:** the timecode exactly as the field shows it, with the start offset (`startTimecode`) applied and `;` before the frames in drop-frame.
- Everything else in the host's hash is kept, in its order. An existing `t` and `tc` are replaced; the new pair goes at the end, `t` first.
- `onCopyLink` reports the new URL. Its payload (`url`, `frame`, `time`) does not change.
- The page URL is not changed. The link is a string that goes to the clipboard, as now.

Examples (use them as unit tests):

| Source | Frame | Link |
| --- | --- | --- |
| 24 fps | 1490 | `#t=62.104&tc=00:01:02:02` |
| 25 fps | 0 | `#t=0.02&tc=00:00:00:00` |
| 29.97 drop-frame | 1800 | `tc=00:01:00;02` |
| 29.97 drop-frame | 17982 | `#t=600.016&tc=00:10:00;00` |
| 29.97 drop-frame, `startTimecode="01:00:00;00"` | 17982 | `#t=600.016&tc=01:10:00;00` |

## 3. Reading a link

When the page opens with a link position, the player seeks to that frame, paused, as now. It reads in this order and takes the first value that gives a frame inside the media:

1. **`tc`**: a timecode, read with the player's `fps`, `startTimecode` and `dropFrame`. `;` (or `.`) before the frames means drop-frame.
2. **`t` holding a timecode**: four fields, `HH:MM:SS:FF` or `HH:MM:SS;FF`. This is the old format, so old links keep working. A Media Fragments value can never have four fields, so this can't be mistaken for seconds.
3. **`t` in seconds**, in every Media Fragments form: `62.5`, `npt:62.5`, `1:02.5`, `0:01:02.5`.
4. **`t` in the platforms' shorthand**: `90s`, `1m42s`, `1h2m3s`.

Seconds become the frame that contains them (round down, with a small allowance for floating-point error).

- If `t` is a range (`t=10,20` or `t=,20`), or `tc` is a range (`tc=a,b`), read the start and ignore the end. An empty start means 0.
- If `tc` and `t` both hold valid positions more than one frame apart, use `tc` and print one development warning (the usual cause is a wrong `fps` or start offset).
- Stop reading the hash at `:~:` (a text fragment directive some browsers leave in place).
- Anything that can't be read is ignored, and the player opens normally.

## 4. Check that Video.js doesn't read the URL itself

Search the installed `@videojs/*` packages for any reading or writing of `location.hash`, `location.search`, `URLSearchParams` or `history.replaceState`. Report what you find. If something in Video.js reacts to `#t=`, say so and stop before changing behaviour around it.

## 5. Docs

- **README, "Links to a frame":** the new format with one example, the reading order of section 3 in one short list, that old links keep opening, and that the fragment never reaches the server, so a link preview in a chat tool can't show the exact frame.
- **FEATURES.md:** the rows for Copy link and for opening a link.
- Remove the README line that says the format may change, if there is one.

---

## Verification

- Typecheck, unit tests, build and the contrast script pass.
- Unit tests: every example in section 2; a round trip from frame to link and back at 23.976, 24, 25, 29.97 drop-frame with a start offset, and 59.94 drop-frame, over a spread of frames including 0 and the last frame of a long video; every input form in section 3, the range starts, the `:~:` cut, a `tc`/`t` disagreement, and garbage.
- Browser checks: update the copy-link check so it reads the copied URL and expects both keys; add a check that opens a page with each of `#t=62.104&tc=00:01:02:02`, `#t=00:01:02:02` (old) and `#t=1m2s`, and finds the player paused on the right frame. Run them in Chromium, Firefox and WebKit.
- Every other browser check still passes; the Viewer still requests no pro chunk.
- Deploy a preview of the branch and check one copied link there by hand: paste it in a new tab, the player opens on the same frame.
- Merge into `main` as `CLAUDE.md` says. Don't deploy production; Artem asks for it.

## Report

1. The preview URL and the final commit on `main`.
2. One line per section, and any differences from this file.
3. The browser check table: Chromium, Firefox, WebKit.
4. What section 4 found in Video.js.
5. Unverified, and Backlog proposals.
