# CREW-03: boarding

Status: building. This lane starts with the owned boarding module and tests.
Native on-foot, grapple, damage and renderer hooks need a Director re-slice
after Balance releases their shared files. Nothing here is a finished player
feature yet.

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

## Checks

Tests will be written before implementation for 49/51 and 89/91 km/h,
25 m reach, target exclusion, the 0.3 s shake, 10 mph crash boundary,
six-second limit, one charge, safe landing, delayed damage and weapon
disable, and identical 30/60/144 FPS outcomes. Browser checks must show
the roof fighter and charge without changing simulation state.
Owned boarding test: 17/17 pass after failing first on the missing module and then on the native on-foot hook. It covers entry speeds, roof and grapple contact, excluded targets, shake, crash, time limit, one charge, safe shoulder, delayed damage, Hard event eligibility and 30/60/144 FPS. The module emits crew.boarding.mount, .throw, .plant, .blast and .release cues. The native fixed fighter step now mounts on Jax grapple arrival, holds fire without spending RPG ammo, and detonates through the armor path even after re-entry. Existing on-foot transition 8/8, Crew gear 33/33 and Crew module 16/16 pass. The native 170 m landing edge test was red, then passed after the Director granted src/onfoot.js: the fighter can walk within a bounded radius of either their landing or parked car, and respawn clears that temporary anchor. A native 91 km/h arrival test was red, then passed after rejected grapples began releasing Jax to a checked shoulder. The on-foot hint fingerprint test caught new boarding timers in races with Crew gear off. Those fields now exist only with the Crew gear switch: the exact hint pins pass 15/15, combat replay pins pass 12/12, and on-foot weapon/contact suites pass. Crash-delta wiring, weapon-disable enforcement, rendering, browser checks, and the final lane gate and build remain. The build after the replay fix passed in 441 ms. A diagnostic changed-file lane run passed 214/215; the only failure was a minimal fighter-presentation fixture without opponents. The roof scan now accepts that empty list; focused fighter presentation 12/12 and boarding 17/17 pass. The exact changed-file lane gate passed 215/215 in 352.21 seconds, and the build passed in 431 ms. These checks cover the partial slice before the new lockout test. That native test is red: a boarded victim can still fire during its 0.8-second lockout, so the combat weapon hook must enforce it. A new native jump-to-roof check passes. Boarding is now 18/19. The final gate will run again after the shared hooks are wired. No released assertion changed.

## Removed

None yet. This new module does not replace a released path.
