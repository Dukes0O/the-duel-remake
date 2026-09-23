---
task: FND-03
status: review
kind: cleanup
flag: none
player_facing: no
---

## What changed

Prepared the obsolete Codex worktree at `.codex/worktrees/4555` for safe
retirement. Its existing branch is
`codex/race-refinements-and-player-settings`. All 22 changed paths were
committed there as `4237c2e`, so the branch preserves the old state.

## Comparison with the promoted desktop work

Compared all 22 paths against commit `7564c7d`, ignoring only CRLF versus LF.
Twenty are identical. Two differ:

- `docs/VERIFICATION.md` in the old worktree lacks the later 22 September
  desktop release promotion note.
- `src/main.js` calls `buildUpdates.syncState()` after setting the nitro label;
  the promoted code calls it before setting that label. The promoted order is
  already covered by update checks.

No old code will be merged into Wasteland from this branch.

## Evidence

- `git diff --cached --check` passed before the archival commit.
- The old branch now holds commit `4237c2e` and has a clean tracked tree.
- `git worktree remove` and the final `git worktree list` check are pending.

## Behavior and test changes

None in the live game or integration branch.
