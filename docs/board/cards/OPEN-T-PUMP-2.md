# OPEN-T-PUMP-2

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol.** Cut by Claude on 26 November 2026 from the laptop run of `open-dry-pump` after OPEN-T-PUMP merged
(integration `00bc06dc7`). The card's checks without graphics all pass; the scenario had never been run in a browser.

## What the laptop run found

The scenario walks to Marigold (`leader`) at the Glasshouse and presses the interact key, then waits for the choice "I'll
go to the Mall for it today." No talk opens at all: the talk box stays hidden, the job's step stays `roam`, and the Dry
Pump's record stays at beat `sign` (began night 2, cast camp `glasshouse`). The run times out at `decisionReady`.

A player walking up to Marigold may meet the same thing, which would make the Dry Pump impossible to begin.

## What to build

1. Find why interacting with Marigold opens no talk in the browser: whether she stands where `leader` says, whether the
   interact reaches the open land's talk (the shared `talk` request and `beginOpenTalk` in `src/arena/modes/world-job.js`),
   and whether the storyline's opening talk is offered at beat `sign`. Fix the cause in the game, not in the scenario,
   unless the scenario stands somewhere a player could not.
2. Then run the whole scenario (see below) and mend each later step the same way.
3. Add a check without graphics that proves the fix: walking to Marigold and interacting opens the Dry Pump's talk with
   its first choices.

## Files and locks

The Dry Pump's own files (`src/world/open/parts/dry-pump.js`, its content rows, `tools/test-open-dry-pump.mjs`,
`tools/scenarios/open-dry-pump.mjs`) and, if the cause is there, the shared talk request in `src/arena/modes/world-job.js`
and `src/world/open/parts/threads.js`. No lock. Other storyline cards are merging into the same shared files: merge
`origin/integration/wasteland` first and keep both sides of any conflict.

## Checks

`tools/test-open-dry-pump.mjs` with the new check, `test-burned-camp`, `test-open-threads`, `test-open-missions`, then
rule 23's set and `npm run build`. Laptop: `open-dry-pump`, whole, which Claude runs; if you can run Chrome, run it
yourself and say so.

## Rules

Behind `story-choices`. Memory-only saves. Questions go to `docs/board/questions/OPEN-T-PUMP-2.md` with your pick.
Write `docs/changes/OPEN-T-PUMP-2.md` with a **Removed** line. After the pull request is open the card is finished.
