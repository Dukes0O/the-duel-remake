---
task: CRASH-03
status: ready-to-merge
kind: physics
flag: crash-physics
player_facing: yes
---

# Smashed cars slide to rest off the road (26 September 2026)

Kyle asked for a struck car to be smashed out of the way as real physics
would. Claude's review of CRASH-01 measured five staged crashes with the
switch on and found two faults in how a struck car slows down afterwards.
The collision solver itself was right. Kyle asked Claude to fix it directly.

## What was wrong

| Crash | Before |
| --- | --- |
| Rival Duel, 100 mph into the back of a 45 mph sedan | Wrecked, slid about 15 m, stopped in the middle of the lane. |
| Same hit in Mad Max | Shoved off the road, then parked from about 76 mph in one tick; parking also pulled a car that had slid past the clear line 6 m back toward the road. |

## What changed

- `src/vehicle-knock.js`: new `WRECK` tuning. A wreck made under crash
  physics (`wrecked.physical`) is stepped by `stepPhysicalWreck`: constant
  friction (6 m/s² along the road, 7.8 m/s² sideways), spin decay as before,
  sideways motion stops 10 m past the clear line, and a sweep against solids
  stops it at a wall instead of passing through. `wreckTraffic` guarantees
  enough sideways speed to clear the nearest shoulder (or the side the hit
  pushed it, when that push is over 1 m/s).
- Roadside shoves (Mad Max) scrub forward at the wreck rate, park only when
  their whole speed is under 2 m/s (9 s at most), and park where they slid to
  when already past the clear line.
- `src/sim-rival.js`: physical wrecks use the new step when the switch is on.
  The released `stepTrafficWreck` is unchanged for everything else.

## After

| Crash | After |
| --- | --- |
| Rival Duel rear-end | Rolls on about 100 m, ends 10.2 m off centre (clear line 8.5 m). |
| Rival Duel off-centre hit | Rolls about 78 m, ends 10.1 m off centre on the side it was pushed toward. |
| Mad Max shove | Rolls about 110 m, parks 14.6 m off centre at under 2 m/s. |
| Titan into a sedan | Thrown sideways, spins, and comes to rest 17.3 m off centre about 66 m on. |

## Tests

- New `tools/test-crash-slide.mjs` (5 cases), committed red first: 4 failed
  on the old code (16.2 m roll, in-lane wreck, 2000 m/s² and 116 m/s² stops).
  The limit is 10 m/s² (about 1 g, forward and sideways scrub combined on a
  spinning car); the final crawl under 3 m/s is allowed.
- `node --test` on the knock integration, knockaway, armored impact, ramming,
  combat replay and collision tests: 48 passed.
- Lane tier: 139 passed, 0 failed, 0 not run. Replay fingerprints unchanged
  (no replay contains a physical wreck). Build passed (existing large-chunk
  advisory only).

## Changed assertions

None. The existing roadside parking fixture (a car inside the clear line)
still parks exactly on the clear line.

## Removed

Nothing. The released wreck and roadside motion stay as the switch-off path
until `crash-physics` turns fully on, when CRASH-01's switch-off branches and
`stepTrafficWreck` for physical wrecks go together.
