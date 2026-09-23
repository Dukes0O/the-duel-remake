---
task: BUG-03
status: merged
kind: gameplay-fix
flag: none
player_facing: yes
---

## What changed

UFO swaps now exchange each car's position, visible heading, lap checkpoint
progress and route context. The player model's slip and crash spin count toward
the heading inherited by the rival. Each car keeps its own speed, capped by
the speed at its new location, the previous occupant's speed and the surface.
Prepared shortcuts cap landing speed at 100 mph; other off-road landings cap
at 68 mph.

Both cars get 1.2 seconds of protection from crash damage after a swap. The
rival route planner discards its old decision and starts from the new spot.
If that spot lies on a shortcut, it follows that corridor through the exit.

## Tests and evidence

- Added heading, speed, protection timing and stale/occupied shortcut checks
  to `tools/test-combat.mjs`. The heading check failed before the fix because
  both cars landed with `headingError` zero. A later test also caught the
  player's visible slip and spin not being transferred.
- Added `tools/test-ufo-landing.mjs`: 100 seeded swaps across all 11 combat
  courses. Nineteen landings are on shortcuts at entry, middle and exit
  positions. Each is driven for two seconds with repeatable steering; all
  have zero crashes, boundary resets and rival wrecks.
- `node tools/test-combat.mjs`: 64 checks passed.
- `node tools/test-ufo-landing.mjs`: 100 swaps passed.
- `node tools/test-npc-route.mjs`: 16,755 checks passed.
- `node tools/test-race-integrity.mjs`: 601 checks passed.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8`: 78 passed,
  0 failed, 0 not run in 286.75 seconds. Replay fingerprints passed 162
  checks; expansion driving completed and won all 48 races.
- `npm run build`: passed with the existing large rendering chunk warning.

## Assertions and race behavior

No existing assertions changed. The new protection uses the existing combat
shield timers, so other damage is also blocked during the 1.2-second landing
window. Lap-history and assisted-lap behavior from BUG-02 remain unchanged.

## Review

Independent review checked heading ownership, surface speed caps, route-plan
rebasing and the 100-swap matrix. The commit was cherry-picked as `26a5795`.
All 146 integration suites passed in 173.30 seconds; the production build and
private High/Performance browser smoke passed with four screenshots and no
browser warnings or errors.
