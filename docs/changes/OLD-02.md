---
task: OLD-02
status: merged
kind: save-cleanup
flag: none
player_facing: no
---

## What changed

`Duel` no longer reads or writes `duel_redline_best_v4`, computes its shared
comparison key, or puts the unused `isPersonalBest` and `best` fields in core
results. `App` still settles per-player bests through `progression.js` and puts
that player's `best` in the result shown to the player.

On startup, after the FND-10 storage migration and career migration checks,
the game makes and verifies a separate backup containing the legacy key. It
then removes the key through the budget storage facade and waits for its
IndexedDB snapshot to flush. A missing key causes no backup or write. Old
career files remain valid for reading; both current and historical import
paths discard this obsolete key after validation. Recovery backups retain
their original entries, including the key, and startup retires it again if a
recovery is restored. Per-player `personalBests` stay intact.

## Changed assertions and red-before evidence

| Test | Changed assertion | Result before updating that assertion |
| --- | --- | --- |
| `tools/test-old-best.mjs` | Added core finish, App settlement, verified retirement, failed-backup, one-time removal, import, and player-record checks. | The new test failed against old `game.js`: finishing wrote `duel_redline_best_v4` with a Pacific Canyon time of 60. |
| `src/test.js` lifecycle | Replaced the removed shared-cache fallback check with the real corrupt-player-save fallback. | After removing the cache, the old assertion threw `TypeError: d._recordBest is not a function` at line 412; remaining assertions in that file were not reached in that run. |
| `src/test.js` timing | Replaced shared `_bestFor` comparisons with `settleRace` and `bestKey` checks for player isolation and car, difficulty, mode, seed, and layout identity. The old upgrade separation was specific to the deleted cache; real per-player bests do not key on upgrade level. | The old block called `_recordBest` first and would throw after the removal; the suite stopped at the earlier lifecycle call. |
| `tools/test-race-integrity.mjs` | Four shared-cache route checks now use the per-player comparison key. | The old first check threw `TypeError: d._recordBest is not a function` at line 128. |
| `tools/test-physics-expansion.mjs` | Three `_bestKey` driver checks now use per-player `bestKey`. | The old first check threw `TypeError: d._bestKey is not a function` at line 170. |
| `tools/test-checkpoint-rush.mjs`, `tools/test-drift-trial.mjs` | Replaced checks of the removed result fields with `isValidFinish`, the gate that actually admits a result to per-player best comparison. | The old assertions stayed green after removing the fields because `undefined` and `null` made them vacuous; both suites exited 0 before the update. |

## Verification

- Based on integration commit `37efad7` (FND-10 included). No real save or
  live game folder was opened or changed.
- `node tools/test-old-best.mjs`: passed after the intentional red-before run.
- `node src/test.js`: 511 passed, 0 failed.
- Focused route, physics, checkpoint, drift, backup, budget, save fixture and
  storage budget suites passed. Seven historical save shapes remained valid.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8`: 79 passed, 0
  failed in 282.66s. Campaign and race replay checks passed.
- `npm run build`: passed; existing large rendering chunk warning remains.
- `git diff --check`: clean.

## Integration

Independent review found no data-loss or result-settlement blocker. The
review covered backup verification before deletion, facade journal and
snapshot durability, both import paths, and the changed record assertions.
Cherry-picked as `fbe4389`. The exact integration state passed 150/150 merge
suites in 161.15 seconds, the production build, and private High/Performance
browser smoke with four screenshots and zero warnings or errors.
