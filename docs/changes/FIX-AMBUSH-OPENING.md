# FIX-AMBUSH-OPENING

Kyle reported THE FORT FELL within about15seconds. Wave one now gives20seconds before rocket fire and fort wear, then6.6seconds between each group’s rockets. Raiders approach and remain hittable; waves2–5 and all health, damage, repair, rewards and saves keep their rules. Entry explains the objective, opening window, separate RPG clicks, automatic reload, movement, wrench repairs, car refill and help before starting. Existing wave sound is reused.

## Checks

New acceptance reproduced the opening collapse in both venues and missing entry instructions before implementation. Existing wear/rocket/repair fixtures now place simulation time after the new approach window; their exact damage and range assertions remain unchanged. Native thirty-second survival, pause and later-wave cadence are checked in the existing Ambush suite. Lane/build/review results follow before handoff. Heavy checks belong to the installed night shift.

## Removed

Replaced immediate first-wave fire and wear, rapid first-wave rocket reload, and the instruction-free Ambush entry panel. No extra mechanism, asset, dependency, save field, reward or test harness.

Development run:37/39 passed, including both native30-second openings. Two new fixtures needed the real discovered-gate eligibility and the actual simulation start deadline; their acceptance stayed exact. Final lane verifies the corrections.
