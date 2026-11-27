# QA-OPEN-DOORS-WASH

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol.** Cut by Claude on 27 November 2026 after 30 minutes on one failure (AGENTS rule 4).

## What is known

`tools/test-open-doors.mjs` fails at line 219: after the ash sack lands on the parked car and the player walks into
Moss's wash shed, `job.open.parts.buildings.inside` is `null` where `'bess-shed'` is expected.

- It fails in the integration folder (`C:\Users\kyleb\.codex\worktrees\wasteland-integration\the-duel-remake`) and in
  Claude's worktree at `710be0c6f`, three times out of three.
- At the same commit, and at `904e07958`, `1aa980cc1`, `b0894b1e8`, `847bb9f2e` and `c76d71bfd`, it passes in a bare
  detached checkout under Claude's scratchpad, which has no `node_modules` of its own. So the difference is the
  environment, most likely which copy of a package (`three`?) node resolves, not the folder's own files: setting
  `art-build/`, `dist/` and `.qa-dist/` aside one at a time did not change the result.
- It passed in Claude's worktree on 26 November after commit `7c176a26f` (the RPG held low in town).

## What to build

Find why walking into the wash shed after the ash sack leaves `inside` empty in the integration folder's environment,
and fix the cause (the game, or the test's setup if it depends on something it should not). Make the test give the same
answer in every checkout. Never change its assertions to pass.

## Files and locks

`tools/test-open-doors.mjs`, and the open land's building part (`src/world/open/parts/buildings.js`,
`src/world/open/building-rule.js`) or the people and routines parts if the cause is there. No lock.

## Checks

`test-open-doors` passing in the integration folder; `test-open-roam`, `test-open-apprentice-run`, `test-open-routines`.
Rule 23's set and `npm run build`. Write `docs/changes/QA-OPEN-DOORS-WASH.md`.
