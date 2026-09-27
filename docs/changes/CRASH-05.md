---
task: CRASH-05
status: merged
kind: fix
flag: crash-physics
player_facing: yes
---

# Mad Max: cars are solids, late explosions, smouldering wreckage (27 September 2026)

Kyle, after playing CRASH-04 in the Preview: high-speed hits drove through
traffic "like it's a gas"; a struck car should be smashed ahead; hits over
250 km/h may blow it up after the smash; lap-one wreckage should smoulder so
lap two shows the carnage. Design: `docs/CRASH_PHYSICS.md` section 7.

## Cause

Reproduced headless: at 160 mph into 40 mph traffic the attacker lost only
about 6 mph, while the struck car gained about 0.6 of the closing speed. The
attacker caught it within a quarter of a second and, because a wreck or
shoved car no longer took part in collisions (and the collision loop skipped
cars that were not alive), drove through it.

## Changes

- `src/sim-contacts.js`: Mad Max traffic hits resolve both cars; the attacker
  keeps control and pays in speed; wrecks and shoved cars are solid
  (`solidTraffic`) in the contact and in the collision loop, for the player
  and computer racers; one shove per touch; a touch below shove speed leaves a
  solid car as it is; outcomes `smash` and `wreck`; `explodeTrafficWreck`.
- `src/vehicle-knock.js`: `forceKnock` only forces the struck car;
  `attackerKeepsControl`; a hulk hit again is shoved as a wreck and keeps how
  it lies and its fate.
- `src/sim-rival.js`: the delayed blast is stepped with the wreck.
- `src/vehicle-collision.js`: `explodeClosingKph` 250, `explodeDelaySec` 0.6,
  `rehitGapSec` 0.25.
- `src/combat-effects.js`: smoke for the twelve nearest wrecks within 450 m,
  and a low flame on blown-up hulks.
- `tools/combat-balance.mjs`: counts smashed traffic as a traffic wreck.

## Tests

- New `tools/test-madmax-solid.mjs` (7 tests, run red first: 5 failing for the
  intended reasons): at 100 and 160 mph the bodies never overlap after the hit
  and the struck car is thrown ahead; the attacker loses at least 0.4 of the
  closing speed; the player keeps control and has no crash; 193 km/h is a
  smash with no explosion; 274 km/h explodes at least 0.3 s after the smash
  and over 8 m further on; a parked hulk rammed at 80 mph moves at least 5 m
  and slows the rammer; wreckage smokes minutes later, the far one does not,
  and a blown-up hulk glows.
- Found and fixed while testing: a shoved car touched again below 2 mph fell
  into the older contact rules, which restarted it as a half-live car whose
  position became not-a-number. It now stays as it is.
- Related suites pass: Mad Max crash, knock-away, crash slide, combat effects,
  crash presentation, armored impact, ramming, knock integration, collision,
  police knock; combat replays unchanged (12 checks).

## Changed assertions

- `tools/test-madmax-crash.mjs`: the hard-hit test expects a smash, not an
  explosion; the "explosions start at a smash" test is removed (CRASH-05
  replaced that rule; the new suite tests the 250 km/h rule).
- `tools/test-combat-knockaway.mjs`: the low-speed shove uses 15% of top speed
  with the cars just touching and expects a real speed cost by momentum (was a
  small flat cost); a repeat touch emits no second hit (was: no contact, the
  car was scenery); the shoved car may still be sliding outward after a
  second (was: moved under 1 m). The hard-hit and oncoming tests expect
  `smash` (227 and 177 km/h are under 250).

## Balance

- Crash physics off (the live game): `--check --flags wasteland2` passed,
  8/5/3 wins, unchanged.
- Crash physics on: the fixed 10-race check fails (Medium 7/10, Hard 1/10,
  Medium CPU hits 8, ufo-max Medium gain 4.92 s). The races are decided by 1
  to 3 seconds and a changed traffic hit flips them; the practice driver had
  0 to 2 traffic hits per Hard race. Over 30 further seeds (2001 to 2030) the
  win rates did not move: Medium 19/30 before and after, Hard 8/30 before and
  7/30 after, both inside the targets. A first run also found the pursuit
  practice driver wedged off-road after missing a bend at 200 mph (no car
  involved); with the symmetric attacker rule the pursuit races complete.
- Carded BALANCE-SAMPLE (Codex): make the balance check use enough races to
  judge a physics change, before CRASH-RELEASE.

## Removed

- The flat roadside speed cost for Mad Max traffic hits under crash physics
  (momentum replaces it; kept with the switch off).
- The CRASH-04 rule that exploded every smashed car.

## Gate

- Lane tier on af1ad1e: 169 passed, 0 failed in 491.55 s. npm run build passed.
- A private browser look was attempted on a memory-only QA page; the browser
  pane was hidden, which slows the game loop too much for a timed staged
  crash, so the look is left to Kyle's Preview. No console errors were seen.
