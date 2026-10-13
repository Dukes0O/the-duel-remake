# FIX-AMBUSH-OPENING

Kyle reported THE FORT FELL within about15seconds. Wave one now gives20seconds before rocket fire and fort wear, then6.6seconds between each group’s rockets. Raiders approach and remain hittable; waves2–5 and all health, damage, repair, rewards and saves keep their rules. Entry explains the objective, opening window, separate RPG clicks, automatic reload, movement, wrench repairs, car refill and help before starting. Existing wave sound is reused.

## Checks

New acceptance reproduced the opening collapse in both venues and missing entry instructions before implementation. Existing wear/rocket/repair fixtures now place simulation time after the new approach window; their exact damage and range assertions remain unchanged. Native thirty-second survival, pause and later-wave cadence are checked in the existing Ambush suite. Lane/build/review results follow before handoff. Heavy checks belong to the installed night shift.

## Removed

Replaced immediate first-wave fire and wear, rapid first-wave rocket reload, and the instruction-free Ambush entry panel. No extra mechanism, asset, dependency, save field, reward or test harness.

Development run:37/39 passed, including both native30-second openings. Two new fixtures needed the real discovered-gate eligibility and the actual simulation start deadline; their acceptance stayed exact. Final lane verifies the corrections.

First lane:177/178 passed, zero unrun,723.87s; build withheld. The only failure was the new cadence fixture assuming a clear shot from native spawn. Terrain correctly blocks that path. Both native30-second survival cases and entry help passed. Cadence now reuses the existing rocket-flight test’s clear65m pose in each wave; all timing/count/damage assertions stay exact. A fresh required lane follows this fixture correction.

Bounded diagnosis: the Pit65m ray crosses a2.37m mound, correctly rejecting both shots until enemies move. The same65m fixture on Salt Flats has a clear ray and produces both native group shots. Cadence uses that flat venue, preserving its exact two-group count and6.6/2.2 deadlines. Both venues retain their separate full native30-second acceptance. No assertion or tolerance was weakened.

Final frozen352eb25d65b22ae2acf81df9e01b6bee41b2c2cf original lane passes178/178, zero failures/unrun,546.1327607s, jobs4; production build1412ms. Independent code/design-number review and real fixture-correction confirmation are clear. Integrated conflict-free after mouse and Summit; no repeated gate. The builder who created this lane owns its cleanup; Root preserves that folder until its owner recycles it. No release/push or real saves.
