# OPEN-APPRENTICE-RUN-3

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol.** Cut by Claude on 26 November 2026 from the independent review of OPEN-APPRENTICE-RUN-2.

With `story-choices` on, every gas run that is not the battle now needs a readable player registry, runs before Night 2
included (they used the shop save before). If storage cannot be read, the run is refused with "Return to the yard" and
nothing is kept, even in memory, and a run before Night 2 has no retry (`src/app.js` near 1776-1782 and 912). Keep the
run's earnings in the session as the failed-write path now does, and offer the same retry. Add a check that a run before
Night 2 retried after a failed write pays once, and that an unreadable registry keeps the earnings.

Files: `src/app.js` (the gas run's settlement only), `tools/test-open-apprentice-run.mjs`. Locks: `busy-game-files`,
`save-shape`. Checks: that suite, `test-run-gas`, `test-save-fixtures`, the lane tier, `npm run build`, and one
independent review before the merge. Behind `story-choices`. Write `docs/changes/OPEN-APPRENTICE-RUN-3.md`.
