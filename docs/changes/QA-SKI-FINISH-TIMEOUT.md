# QA-SKI-FINISH-TIMEOUT

## Finding

The existing headless heli/ski suite completed all 21 tests, including ski
session completion, and the run-data suite covers the giant slalom's 40 gates
and 1,100 m course. This gives no evidence of a deterministic simulation hang.
It does not prove that the browser page remains responsive.

The `ski-finish` scenario advances 120 simulation frames in each
`Runtime.evaluate` call and allows up to 300 batches per run. The failing
browser report timed out after six screenshots, but contains no saved browser
trace that identifies which evaluate call stalled. The current evidence cannot
separate a browser-only hang from the scenario exceeding its evaluate budget.
No game or scenario behavior was changed based on an unproven cause.

## Claude browser check

Re-run `ski-finish` with a memory-only save and keep the browser trace. Record
the last completed screenshot and the exact pending `Runtime.evaluate` call.
If it is a ski simulation batch, inspect whether the live session's `t` and
skier position advance during the giant slalom; if it is the next `evaluate`
after the six screenshots, compare its work with the 120-frame batch limit.
Confirm whether the test reaches the giant-slalom result card before changing
game code or the scenario.

## Checks

- `node tools/test-ski-heli.mjs` — passed, 21 tests.
- `node tools/test-ski-runs.mjs` — passed, 232 checks.
- `npm.cmd run build` — passed. Existing dynamic-import and large-chunk
  warnings remain.
- Browser and look checks — not run in this lane; Claude owns them.
- Assertions changed: none.
- Race fingerprints: none changed; no simulation files changed.

## Removed

- Nothing replaced or removed.
