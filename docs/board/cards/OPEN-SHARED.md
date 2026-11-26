# OPEN-SHARED

The short board entry controls current state, ownership, dependencies and locks.

Claude's card, built on the laptop on 25 November 2026, first of the two days on the open Scablands (Kyle, 25
November 2026). Design: `docs/story/open-scablands.md` sections 10, 12, 15 and 18.

## Why it exists

As cut on 21 November the open Scablands cards waited on each other seven deep, because the one way of asking a
question, the open record and the new effects sat inside OPEN-ROAM and OPEN-STATE. This card holds those shared parts,
so that every other card is built at the same time, each against the same sample states.

## What it holds

1. **The one way of asking,** `isTrue(fact, world)`, for every fact of section 12, and the `world` it reads: the
   ledger, the open record, the town as read, and the seed.
2. **The open record, in memory:** its shape at version 1 and the six new effects (`find`, `site`, `favour`, `scrap`,
   `thread`, `town`) as plain functions that return a new record and the journal line. OPEN-STATE saves it.
3. **Holds:** taking, dropping and asking (`checkpoints`, `signs`).
4. **The register:** every people, person, group, place, site, scarce thing, word and feud word by one id and one
   name, with a check that refuses a name it does not know.
5. **A check for every table:** a person, a building, a checkpoint, a site, a need and a thread (`checkThread`), each
   returning sentences that name what is wrong.
6. **Sample states for tests:** the state section 21 is written for, a first night, and a state with nothing found.
7. **One place where a story registers its steps and its start,** so that a later card adds files and leaves
   `src/app.js` and `src/arena/modes/world-job.js` alone.

## Files and locks

New, all under `src/world/open/`: `facts.js`, `open-record.js`, `open-effects.js`, `holds.js`, `register.js`,
`check-tables.js`, `samples.js`, `story-steps.js`; and `tools/test-open-shared.mjs`. Lock: `busy-game-files`, for the
one registration hook.

## Checks

`tools/test-open-shared.mjs`; rule 23's small set; `npm run build`; one independent review before the merge, because
every other card is built on it.

## Sound cues

None.
