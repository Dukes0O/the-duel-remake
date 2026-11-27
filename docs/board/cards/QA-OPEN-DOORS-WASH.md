# QA-OPEN-DOORS-WASH

The short board entry controls current state, ownership, dependencies and locks.

**Codex model: Sol.** Cut by Claude on 27 November 2026 after 30 minutes on one failure (AGENTS rule 4).

## What is known

`tools/test-open-doors.mjs` fails at line 219: after the ash sack lands on the parked car and the player walks into
Moss's wash shed, `job.open.parts.buildings.inside` is `null` where `'bess-shed'` is expected.

- It fails in the integration folder (`C:\Users\kyleb\.codex\worktrees\wasteland-integration\the-duel-remake`) and in
  Claude's worktree at `710be0c6f`, three times out of three.
- It follows the folder, not a commit. At `c76d71bfd` and `847bb9f2e` (the checkout confirmed at that commit) it
  passes in a fresh detached checkout outside the repository's folders (under Claude's scratchpad). Inside the
  repository's folders (the integration folder, Claude's worktree, the Show Night session's worktree) it fails, also at
  `d85d29a4c`, which adds only a card. The Show Night merge `b0894b1e8` is not the cause; it touches no shed code.
- So something found by walking up from a folder inside the repository changes the result: a `node_modules` above it
  (the live game folder's), an ignored generated file, or a config file. Compare what the test loads in both places
  (log the resolved module paths) before changing any code.
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
