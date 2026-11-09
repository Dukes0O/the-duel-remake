# BOARD-LINES

## Changed

- Added all 91 captions from section 3 of `docs/story/the-notice-board.md` to `src/story/board-lines.js`, preserving each id, speaker, timing and line exactly. Registered them with the existing town caption registry, which accepts the `board.*` ids.
- Added `tools/test-board-lines.mjs`. It reads the line tables and section 4 data block from the story page, checks exact line matches and limits, and confirms every referenced `board.*` id resolves.

## Checks

- `node tools/test-board-lines.mjs` — passed: 91 lines and 91 job references.
- `node tools/test-repo-hygiene.mjs` — passed.
- `npm run build` — passed. Vite reported the existing dynamic import warning for `src/game.js` and chunk-size warnings.
- Memory and disk before build: available RAM 10.6 GiB; commit headroom 8.0 GiB; free disk 46.8 GiB.
- Browser and look checks — not run; Claude owns those checks. Claude should check that the board captions appear through the registered `board.*` ids when BOARD-JOBS wires them in.
- Changed assertions: none. The new test assertions cover the card's stated acceptance checks.
- Race fingerprints: not applicable; this adds caption data and does not change race simulation.

## Removed

- No prior implementation existed in this lane. Temporary check logs and generated build output are removed before handoff.
