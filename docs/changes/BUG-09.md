---
task: BUG-09
status: review
kind: gameplay-fix
flag: none
player_facing: yes
---

## What changed

Bomb and crossbow hits now dent the panel facing the incoming projectile.
Combat uses the same front, rear, left and right panel rule as vehicle
collisions, with the car's visible heading. A stationary blast exactly at a
car's center keeps the earlier rear-panel result because it has no clear side.

## Tests and evidence

- Added eight cases to `tools/test-combat.mjs`: each weapon approaches a
  rotated car from all four sides. The front-bomb case failed before the fix
  because it dented the rear. All eight pass after the fix.
- `node tools/test-combat.mjs`: 37 checks passed.
- `node tools/test-contact-damage.mjs`: 195 checks passed.
- `node tools/test-npc-vehicle-damage.mjs`: 1,656 checks passed.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8`: 77 jobs passed,
  none failed or skipped, in 353.08 seconds. The 162 replay fingerprint
  checks stayed unchanged across 18 cases, three frame rates and three runs.
  Expansion driving completed and won all 48 races with zero failures.
- `npm run build`: passed. Vite reported the existing large rendering chunk
  warning.

## Assertions and race behavior

No existing assertion changed. The BUG-12 removed-traffic and live-traffic
checks remain intact. The new cases prove that the hit changes only the
struck panel. This changes visible dent placement; impact force, speed,
cooldowns and hit events stay as before.

## Review

The branch is ready for independent code review before integration.

## Review fix: rival and traffic facing

The rival renderer uses course heading plus `headingError`. Traffic also
adds a half-turn when it drives toward the player. Their renderers do not
use `slipAngle` or `crashSpin`; combat now follows those same headings for
panel selection. Player dents still include both rotation terms.

- Added a rival crossbow case and an oncoming traffic bomb case. Each checks
  that only the visible front panel dents even when stored slip and crash
  spin are nonzero. The rival case failed before the review fix.
- `node tools/test-combat.mjs`: 39 checks passed.
- `node tools/test-contact-damage.mjs`: 195 checks passed.
- `node tools/test-npc-vehicle-damage.mjs`: 1,656 checks passed.
- `node tools/run-tests.mjs --tier lane --changed --jobs 8`: 77 passed,
  0 failed, 0 not run in 264.82 seconds. Replay fingerprints passed 162
  checks; expansion driving completed and won all 48 races.
- `npm run build`: passed with the existing large rendering chunk warning.

The BUG-12 removed-traffic and live-traffic assertions remain unchanged,
including the rear-panel result for a stationary blast at the actor center.
