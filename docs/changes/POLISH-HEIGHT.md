# POLISH-HEIGHT — finite scenery bounds

Status: approved correction and armor adjustment pass final gates; ready for integration.

Approved balance decision: keep the corrected heights and raise only ordinary
arena armor enough to restore the existing Medium 10–14 wreck target. The first
practical 0.01 step passes: 1.20→1.21 (+0.83%, F42 120→121). The same twelve
rounds now average 13.833 wrecks (166 total), down from 14.167 (170 total).
The warlord scale remains 0.5 and all released warlord health stays exact.
Existing wreck-rate and exact-health tests already cover this adjustment.

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
- Final lane: 364 passed, 0 failed, 0 not run in 922.15 s on 10 October.
  Final production build passes. Ordinary race and combat replay checks pass.
- First resumed gate found the two shared Fuel/Bounty control pins described below.
  The Director canceled that superseded run at 251/364 after the focused fixes
  passed. Fuel 67/67 and Bounty 40/40 pass with unchanged road and Sal pins.
- Unchanged wreck-rate and warlord-health suite: 5/5 checks pass at 13.833 mean.
- Independent review: Director passed the height correction, ordinary armor change
  and both narrowly updated arena trace pins; no remaining findings.
- Existing assertion code and thresholds changed: none. The approved ordinary
  arena trace scope/hash update is detailed below; ordinary race fingerprints stay exact.

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
metadata non-enumerable preserves authored geometry and its exact physical hash.
The approved armor-only trace change is documented below. Scenery
sweep consumers retain original objects. Hollow lap copies already have finite
authored heights; the grounded cactus copy intentionally uses legacy dimensions.

## Approved arena trace update

Claude approved the height correction on 10 October: the old wreck rate included
invisible mid-air collisions. Kyle authorized ordinary-car armor as the balancing
lever. The original twelve-round target remains 10–14, and the first practical
armor step passes. Every released car's warlord armor and Sal's health at all
three difficulties pass unchanged; the warlord scale remains exactly 0.5.

The eight-second Scrapdome trace records armor, so its expected hash changes with
this approved behavior. Direct paired native traces differ only in sixteen armor
fields: F42 120→121 and Dusthawk 112.74628214682305→113.68583449804657 at each
of eight snapshots. Movement, airborne state, phase, clock and scores stay exact.
The Director approved only the trace hash and 120→121 scope text update; no test
assertion or threshold changed. Geometry and ordinary replay-file hashes stay exact.

- Previous trace: `6817883b3be0567e9bb201581fa30726f1f35ffd0b2f3d50fb1c7178e90411bc`.
- Approved trace: `9c13f87711a4e17dbd91d4149bfaf8147d49af985d3b1f6ff3bfd0ac14f88e03`.

The shared Fuel/Bounty ten-second control needed the same approved update.
Recursive paired native traces differ only in thirty rival armor fields (three
rivals at ten snapshots), starting with Dusthawk 112.74628214682305→113.68583449804657
and Aurora/Stuttgart 120→121. Later hits subtract identical damage. Every non-armor
field, including the whole arena state, movement, clock and results, is exact.
The Director reviewed this evidence and approved only the Last Car Rolling pin
and scope text update. Road and Sal pins, inputs and assertions remain exact.

- Previous Fuel/Bounty LCR: `6584140072fa4ad9703e80236493093929644110632d91cd53e972024b44a767`.
- Approved Fuel/Bounty LCR: `cc5505d413bd09af32d02e2b6854163bafb8f9940eaa3a14812700f046a7a9e6`.

## Removed

The airborne cactus-only guessed height is replaced by the measured model bounds.
Its compatibility path remains for grounded cars and custom/older courses that
lack measured bounds, preserving their existing results.
