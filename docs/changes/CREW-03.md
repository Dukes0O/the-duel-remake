# CREW-03: boarding

Status: ready for integration review. The Board granted the required shared hooks after Balance. The Boarding rule, native hooks, render tell, finished-cue mapping and private browser check are built.

## Decision before code

The settled behavior is docs/CREW.md section 2. These choices make its
boundary and timing rules testable before implementation:

- Roof boarding is a downward crossing of the roof height while the fighter
  is above the enemy car footprint. The car must be moving below 50 km/h at
  contact. Jax's existing grapple arrival may board an enemy car within 25 m
  only if it is still moving below 90 km/h at arrival. Traffic and the
  player's own car are never player boarding targets.
- A boarded fighter follows the car's roof mount at the fixed simulation
  step. Sideways acceleration must stay above 9 m/s squared for 0.3
  continuous seconds to throw them; a crash delta-v over 10 mph throws them
  at once; six seconds aboard is the maximum. A lower acceleration resets
  the continuous timer. None of these timers use graphics frames.
- Holding fire for one continuous second plants one charge. On planting, the
  fighter automatically leaves the roof and lands at a checked safe shoulder
  point beside the car. The landing search checks both sides and rejects
  scenery and off-course positions. The charge detonates two seconds later,
  deals 35 armor through the native damage path and disables the target's
  weapons for 0.8 seconds. A boarding cannot plant a second charge.
- A computer may board the player's car only on Hard in Ambush Alley or
  Convoy Raid. This eligibility can be tested before those future events
  are built; no ordinary race gains that behavior.
- A boarded computer driver aims for the opposite lane, then alternates sides every 0.75 fixed simulation seconds while a fighter remains on its roof. It uses the normal steering, grip and road limits, so this is a turn rather than a lane teleport. Ground-fighter attack and avoidance treat a roof rider as aboard. The shake timer decides whether any turn is hard enough to throw them.
- A rider already on a target roof is exempt from the ordinary ground-fighter vehicle-hit sweep while boarding remains in the roof phase. The fixed boarding rules still throw the rider for a hard turn, crash delta-v or the six-second limit. Once the rider lands, the ordinary ground hit rule applies again.
- The roof fighter and blinking charge are presentation of simulation state.
  They do not control boarding, timers or damage. The feature's sound cues
  will be named before their shared audio hook is wired.
- The five named boarding events reuse existing, finished game cues: mount,
  throw and release use `vehicle.landing`; plant uses `crew.sticky.arm`; blast
  uses `crew.sticky.explode`. These match the landing, charge arm and explosion
  actions. No new sound source, catalog entry or sound-bank hook is needed for
  Boarding. The event names remain distinct for tests and later sound design.

## Changes

- Added the Boarding rule module and native hooks for roof and grapple entry, fixed-step shake and fire timers, crash delta-v, safe landing, delayed armor damage, and the 0.8-second weapon lockout.
- The ordinary vehicle-hit sweep skips a current roof rider. Ground fighters can still be hit. A boarded computer driver alternates lane goals through its normal steering solver; cars no longer treat a roof rider as a ground fighter.
- Added a bounded roof charge mesh and used the existing finished spatial cues for the five named Boarding events. The mount cue now carries the roof position.
- Added one private browser scenario with memory-only saves. It checks the real car exit and grapple arrival, the visible roof fighter, a one-second fire hold, the visible blinking charge, and read-only rendering.

## Checks

Native Boarding checks were written red before the missing hooks and fixes. They now pass 24/24, including 49/51 and 89/91 km/h boundaries, 25 m grapple reach, shake and crash thresholds, six-second roof limit, one charge, safe landing, weapon lockout, 30/60/144 FPS equality, real crash delta-v, roof visual state, spatial cue routing, ground hit preservation, and boarded driver steering. The roof-hit and mount-position tests each failed before their fixes. The swerve test failed before the driver hook and roof-rider AI change.

Focused regressions pass: on-foot race 3/3, on-foot car contacts 57/57, on-foot transition 8/8, on-foot hints 15/15, fighter presentation 12/12, Crew gear 33/33, combat replay pins 12/12 and general replay fingerprints 162/162. The replay pin files and assertions are unchanged. A mistaken attempt to run a nonexistent `tools/test-combat-weapons.mjs` found no such file; the native weapon lockout is covered by Boarding and the lane tier.

Private `boarding` browser scenario passed on port 23599 with two review screenshots, zero warnings and zero errors. The review shows Jax standing on the rival roof and the planted orange charge on that roof. Earlier red browser runs exposed the roof-hit bug. The final camera follows the rival after planting so the charge stays visible. Browser captures are review evidence only.

The exact changed-file lane gate passed 345/345 in 556.67 seconds on source commit 2bf0e2f. The production build passed in 423 ms. Both will run again on the final note commit before merge. No released assertion was changed or weakened. New checks and the camera-only browser fixture were added.

## Removed

No old runtime feature was replaced. The sound bank and audio catalog needed no new entry because Boarding reuses finished cues. Review captures and scratch builds will be removed after merge under the janitor rule.