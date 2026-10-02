# ARS-01 tests-first slice

Source has not started. This slice adds independent acceptance tests for
Harpoon and Caltrops and four appended combat-balance counter checks.
Existing assertions, balance bands and replay pins stay unchanged.

## Coverage

- Native weapon admission, launch, recharge and upgrade transactions.
- Harpoon leading flight, cone, literal range, damage, tether, yank and breaks.
- Inclusive hard-away steering at 0.6, just below threshold, toward-shooter
  input and half-second accumulation across a neutral interval.
- Caltrops placement, dimensions, lifetime, once-per-car damage, refreshed
  grip effect and top-speed cap; native owner grace in road and arena.
- Actual player, road CPU and arena CPU speed consumers.
- All four wave-one CPU triggers, generated loadouts and native use accounting.
- Memory-only purchases, equipment, upgrades and rejected transaction controls.
- Actual App.advance cadence at 30, 60 and 144 FPS.
- Real stage/menu cleanup and bounded renderer state purity and disposal.

## Settled rules

Claude's answers are in docs/ARSENAL.md, integrated at 7e0e612:
- Caltrops ignores its owner during the first second; contact becomes eligible
  at exactly 1 s and still occurs only once for that body and strip.
- Harpoon counts actual steering input with abs(steer) >= 0.6 toward the side
  away from the shooter. The 0.5 s total need not be continuous.
- Native driving maps positive steering input to negative yaw. Boundary tests
  derive the away sign from actual car poses; they never inject effect counters.

There are no remaining literal-rule questions for these two weapons.
Audio has a separate owner. Native sound cues, private High/Performance browser
checks and the full 30-race balance gate remain builder work.

## Validation

2 October 2026, after an ordinary merge of integration into this clean lane:
- node --check tools/test-arsenal-wave1.mjs and git diff --check pass.
- node tools/test-arsenal-wave1.mjs: 57 checks, 5 passed, 52 failed.
- The six new checks are genuine RED at actual native launch: four Harpoon
  boundaries report "native discovered Harpoon fire must succeed"; road and
  arena owner grace report "native owner drops its actual Caltrops".
- Each returns false where true is required. No missing import/export/module
  error or fabricated weapon/effect supplies the failure.
- The existing 46 failures remain missing native Harpoon/Caltrops admission,
  purchase/equipment, CPU use, or the launch preconditions for later behavior.
- Five controls still pass: Oil CPU positions, Smoke CPU positions, Smoke
  recent-hit requirement and both rejected purchase/discovery/switch/
  normalization transaction checks.

Earlier 1 October evidence, not rerun in this bounded handoff:
- node tools/test-combat-balance.mjs: 33 checks, 29 passed, 4 failed.
- Existing balance checks pass; new native accounting checks fail at purchase.
  Zero-use validators accept missing Harpoon or Caltrops CPU evidence.

Launch failures leave downstream flight, contact, timing, speed, cadence,
cleanup and rendering assertions unreachable. These are not passing evidence.
The builder must rerun the same tests after implementing the settled rules.
No broad lane/full tier, build, browser or balance job ran for this handoff.
No Source, replay pin or existing assertion changed.

## Removed

None. This slice adds tests only and does not replace runtime behavior.
