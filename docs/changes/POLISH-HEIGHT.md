# POLISH-HEIGHT — finite scenery bounds

Status: waiting on Claude for the arena balance decision; do not merge.

Decision: measure the existing geometry once and store its vertical limits on
course scenery as non-enumerable runtime metadata, preserving authored geometry
serialization. Airborne cars, fighters and existing projectile scenery sweeps
use those limits. Clearing the visible top by 0.3 m passes; intersecting it hits.
Grounded cars keep the original authored bounds, including elevated structures.
This fixes a collision bug and adds no feature switch or sound event.

The inventory covers every course on all three curated seeds, hidden-road banks,
Rustwall, Muddy Hollow and all three arena venues. `--models` measures the actual
pine, cactus, boulder and Pit geometry. Primitive model extrema are recorded beside
their source dimensions. Rendering does not write simulation state.

Legacy car bolts, bombs and RPGs mostly never tested scenery; this card preserves
that eligibility. Existing crew-gear and Rocket Pod scenery sweeps use the new bounds.

## Checks

- Before implementation: 34,600 of 43,745 colliders lacked finite tops; acceptance failed.
- Ordinary replay fingerprints: all 162 checks pass before and after implementation.
  Combat replays: 12 checks pass. Expansion driving: 648 checks pass.
- Native: 43,745 finite colliders and unchanged grounded sweeps; 21 car cases,
  geometry measurements and crew-projectile clear/touch checks pass.
- Browser: private port 48182, High and Performance; 36 clear/touch/grounded
  crossings and six real UFO actions passed, with zero warnings or errors.
  Each UFO relocates 28 m across a road rail or the Pit pile; driving the same
  path hits. Road courses use their native rails/boulders; the Pit supplies
  the scrap pile. UFO is the released instant relocation, not a flight.
  This run preceded the metadata serialization fix; final native checks verify
  the same measured bounds after that fix.
- Lane tier: 362 passed, 2 failed, 0 not run in 1051.15 s.
  Failures: Pit geometry hash (fixed during the run; focused 27/27 passes) and
  arena wreck rate (still blocks merge). No passing lane gate is claimed.
  Production build and native height checks pass after the final metadata change.
- Independent source review: Director passed after grounded compatibility fix.
- Existing assertions changed: none. Replay fixtures changed: none.

One-time construction benchmark: Eifel Crown added 219 ms CPU / 164 ms wall
time across four alternating runs; Pacific/High Country added 8/16 ms CPU.
The cost measures rendered terrain planting and buried mountain bounds once.
No per-frame geometry work was added. Director accepted this startup cost.

The first lane run caught redundant metadata on already-finite parked cars;
those objects now stay untouched and all 424,603 parking checks pass unchanged.
A later run caught the authored cactus fallback used by custom/older courses;
the fallback remains when measured bounds are absent. All 195 contact-damage
checks pass unchanged.
The Pit geometry hash exposed enumerable derived metadata. Keeping this runtime
metadata non-enumerable preserves authored geometry; all 27 Pit checks now pass,
including the unchanged physical hash and eight-second native trace. Scenery
sweep consumers retain original objects. Hollow lap copies already have finite
authored heights; the grounded cactus copy intentionally uses legacy dimensions.

## Open balance decision

On baseline `3af7f15`, the unchanged arena wreck-rate check passes at 13.750
wrecks per round. Measured heights produce 14.167, exceeding its 10–14 target.
The 12 Medium rounds use field 3, seeds 1989/7/42/2024, and Banshee/Viper/F42.
Changed wreck counts: 1989/Banshee 14→15, 42/Viper 13→14, 2024/Banshee 12→14,
2024/Viper 15→16. All other wreck counts match. This is a real balance effect;
no armor, target, tolerance, assertion or replay fixture was changed. The Director
filed the decision for Claude and marked this card waiting. Investigation stopped
after the bounded before/after comparison.

## Removed

The airborne cactus-only guessed height is replaced by the measured model bounds.
Its compatibility path remains for grounded cars and custom/older courses that
lack measured bounds, preserving their existing results.
