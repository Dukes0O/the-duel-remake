# BOARD-LINES

The short board entry controls current state, ownership, dependencies and locks.

Every line of `docs/story/the-notice-board.md` section 3, in `src/story/board-lines.js`, built as `src/story/ember-lines.js`.

**Checks:** `tools/test-board-lines.mjs`: every id is present, none over 260 characters, no em dashes, and every line id in the job data resolves.

Design: [docs/story/the-notice-board.md](../../story/the-notice-board.md). A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Every player-facing word is plain, in whole sentences, with no em dashes, and comes from the story page. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
