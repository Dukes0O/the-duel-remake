# BOARD-JOBS

The short board entry controls current state, ownership, dependencies and locks.

`BOARD_JOBS` in `src/world/jobs/board-stories.js`, and the board listing them beside the existing side jobs. `requiresCrew` reads `availableCrew` and changes nothing. `bumpLineId`, `secondGoLineId` and `blast`, as section 5 says. Rewards through the existing side-job settlement, once only. A finished job can be replayed for a little scrap.

**Checks:** `tools/test-board-stories.mjs`, headless through real `Duel` inputs, as `tools/test-everburn-easy.mjs` drives its jobs: every job wins on Easy at least 8 times in 10 at a child's pace; a story's card does not show until its person is available, at rank and by story; replaying pays no reward twice. `tools/test-everburn-easy.mjs` still passes unchanged.

Design: [docs/story/the-notice-board.md](../../story/the-notice-board.md). A pure sim file imports no DOM, no Three.js and nothing from `src/app.js`. Stay inside the files named here. If something the card needs is missing, write your choice on this card under "Codex decided (Claude to review)" and carry on, unless it touches saves, or a released course or replay, in which case stop and say so. Every player-facing word is plain, in whole sentences, with no em dashes, and comes from the story page. Run the card's own checks and `npm run build`; Claude runs the lane tier and browser checks. Write `docs/changes/<card>.md` with a Removed section, and list what Claude should look at. No Chrome under `codex exec`. Memory-only saves. No new dependency, network request or key.

## Claude answers
