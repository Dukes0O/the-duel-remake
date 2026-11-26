# OPEN-APPRENTICE-RUN-2

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol** (on the Codex command line, `gpt-6.1-sol`). Cut by Claude on 26 November 2026 from the
independent review of OPEN-APPRENTICE-RUN's save and embers at its merge. Nothing here held that merge, because the
work is behind `story-choices` (dev); item 1 must be fixed before that switch goes on.

## What to build

1. **The kiln and the routine start after Night 2 (Claude's decision).** Today a hand gas run with `story-choices` on,
   before Night 2 has been played, makes `worldForProfile` build a fresh Night 2 ledger, bakes 3 embers into it and
   saves it; `night2StartingLedger` then opens Night 2 with 7 embers in place of the written 4
   (`src/app.js` near 948-985, `src/world/open/routine-run-rule.js` near 690, `src/world/jobs/night-2.js` near 49-51).
   That night's delivery also blocks a second Story Wall run with no line. The gas measurement, the kiln, the offer and
   the routine apply only when the saved ledger's night is past 2 (Night 2 banked). Before that a gas run pays as it does
   today, and writes nothing to the ledger.
2. **A run that cannot be measured still pays.** When `routineGasArrival` is missing, or the ledger's night differs from
   `trip.night` (`src/app.js` near 1806-1815), the whole settlement is refused and "TRY SAVING AGAIN" can never succeed.
   Settle the run's scrap and feud as usual, bring home no gas, and report it in the console.
3. **A failed save keeps the run's earnings.** With the switch on, a failed save holds the run's scrap and feud step only
   in a retry (`src/app.js` near 1823-1829); "BACK TO THE YARD" loses them. Keep them as the switch-off path does with
   `_saveShopProfile`.
4. **Tests for what the review found untested:** a run before Night 2 leaves Night 2's opening stock exactly as written;
   a run arriving with no measurement pays scrap and no gas; the day clock does not move while paused; with the switch
   off, the saved profile after a gas run matches the profile before this card field by field.

Note, not a fault: a breakdown, a rest and a restart bring Bess home at full health, so the load is 60 with `clean: false`.
That matches "health on arrival" as written; leave it.

## Files and locks

`src/app.js` (the gas run's settlement only), `src/world/open/routine-run-rule.js`, `src/world/jobs/night-2.js` (the
starting ledger only), `tools/test-open-apprentice-run.mjs`. Locks: `busy-game-files`, `save-shape`.

## Checks

`tools/test-open-apprentice-run.mjs` with the new checks, `test-night-2`, `test-story-ledger`, `test-save-fixtures`,
`test-run-gas`, `test-field-battle`. Not rule 23, because it changes what is saved: the lane tier
(`node tools/run-tests.mjs --tier lane --changed --jobs 4`), `npm run build`, and one independent review of the save
change before the merge.

## Rules

Behind `story-choices`; with it off nothing changes. Memory-only saves in every check. Never wipe or hide progress.
Questions go to `docs/board/questions/OPEN-APPRENTICE-RUN-2.md` with your pick. Write
`docs/changes/OPEN-APPRENTICE-RUN-2.md` with a **Removed** line. After the pull request is open the card is finished.
