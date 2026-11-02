# HELI-CHART-MIRROR

Claude (flying line), 1 November 2026. Card `docs/board/cards/HELI-CHART-MIRROR.md` (its "Claude decides" section
settles which side moves).

## What changed

The pilot's map chart keeps its picture (its coasts, places and the bearings it shows); what flips is how the world
maps onto it. The chart counts east as +x, the world (the HEADING gauge, the 3D view, the D key) as -x.

- `src/heli/heli-jobs.js` `bearing()`: still read from the map, now returned as a world vector with east at -x. Arrivals
  (`heli-session.js` arrivalPoint), the cruise leg's departure goal and each course's flying area follow it, so a place
  drawn east of a course is reached and left on the gauge's east.
- `src/heli/pilot-map-view.js`: the helicopter's dot is `drawAt.x - heli.x / 1000`, and its arrow turns the gauge's way
  (`rotate(-heading)`). `bearingKm` and the hover bearing already counted the chart's own east and are unchanged.
- `tools/build-pilot-map.mjs` traces each outline from world -x; `src/generated/pilot-map.json` rebuilt from it.
- `src/lab/benches/headings.js`: `leg()` reads the world vector with `compassBearing`. Its answers are the same numbers
  as before (Tremblant Woods to Panorama Ridge 319.4, to Tremblant Snow 14.7), since the chart's bearings never moved.

## Removed

- Nothing replaced; the mirror readings in `bearing()`, the dot, the arrow and the outline trace were changed in place.

## Changed assertions (Claude's review, rule 18)

Each written for the mirror; none loosened.
- `test-map-destinations.mjs` "Eifel Crown lies north-east of home": the world vector is now `x: -12 / d` (was `+12 / d`).
- `test-heli-jobs.mjs` and `test-heli-autopilot-rescue.mjs` "Summit Run north-west of Panorama Ridge": north-west is
  world `x > 0` (was `x < 0`).
- `test-lab-benches.mjs` headings: `leg()` equals `compassBearing(unit.x, unit.z)` exactly (was `atan2(unit.x, unit.z)`
  of the same vector). The pinned answers, 319.4 and 14.7 degrees and 9.22 units, are unchanged.

## Test flights changed (no assertion touched)

- `test-ski-heli.mjs`, the thin-air and powder tests: from Tremblant Woods the helicopter now arrives on the gauge's
  side of Summit Run, 650 m farther from the summit ski pad. At 18 m/s the scripted pilot, which climbs in place before
  each ridge, ran the tank dry 3 km short; it flies that leg at 24 m/s and lands with fuel to spare.
- `test-heli-skin-session.mjs`, the wildlife count: the count's square is placed at random inside the flying area, which
  moved with the arrivals; it now starts 93 m north of the pad. The count flight climbs in place before its pattern
  (it scared animals on the way up), and its lines are 110 m apart, not 120: with a 60 m reach, 120 m covers the rows
  midway between two lines only on a perfectly straight line, and this pilot covered 94% over the new ground (99% now;
  the check still asks 95%; docs/HELI_WILDLIFE.md now says about 110 m). The low-pass scare test crosses to its pass at 110 m first (at 30 m from the pad the pilot
  flew into the ground cover); the pass itself is the same.

## Re-recorded pins (one reason each; views compared field by field, old code against new)

- `test-map-destinations.mjs` BEFORE.bearings, was 3418701639: `bearing()` gives east as world -x; with each x turned
  back the table hashes to 3418701639.
- `test-heli-jobs.mjs` switch-off list, was 1330338215, and `test-heli-survey.mjs` BOARD_FINGERPRINT, was 2469111954:
  the same, two bearings and the bearing table; with x turned back each hashes to its old pin.
- `test-heli-rescue-session.mjs` FIRE_SESSION_FINGERPRINT (was 3467651565), `test-heli-summit-rescues.mjs` OFF_PIN and
  SUMMIT_ONLY_PIN (were 1599392491, 274976626), `test-heli-skin-session.mjs` all six (were 3266723423, 2071532041,
  2249168172, 3614661767, 1879391574, 1049849445): only the flying area's minX and maxX moved (the arrival points it
  covers are now the mirror about the landing zone).
- `test-heli-summit-arrival.mjs` OTHER_ARRIVALS_PIN, was 1375301816: each arrival is the mirror about the landing zone
  (x, heading and sideways speed flip; z and height the same); fuel moved because the flight out to the area's edge
  took a new heading to new edges, and the ground height follows the new arrival point.
- `test-heli-autopilot-rescue.mjs` OFF_PIN, was 3493369388: the area edges, the arrival heading and the approach from
  there (position within 2 m, fuel within 5 kg, the readout).
- `test-heli-summit-tune.mjs` AUTOPILOT_PIN, was 1475763491: the autopilot's legs now leave and arrive on the gauge's
  side, so its sampled flights follow new lines; the suite's own clearance checks pass on them.

## Checks

- New in `test-map-destinations.mjs`: from the home pad, read the moving map's hover bearing to Pacific Canyon (drawn
  west, 250) and to Harbor & Highlands (drawn east), fly that heading by the gauge's own compass to the area's edge,
  take the cruise leg and arrive. The leg leaves the way the chart points, the chart's dot moves that way, and the
  arrival sits on home's side of the place on the chart and by the gauge, facing the pad. On the old code it fails at
  "the leg leaves the way the chart points".
- The chart looked at once against the world from above (north up, world -x to the right) for Tremblant Woods,
  Panorama Ridge, Summit Run, Pacific Canyon, Harbor & Highlands and Alpine Serpent: each outline is its road's shape
  and start; the helicopter placed 1.2 km to world -x of home sits east of it, its arrow on 090.
- Arrival ground check, all destinations, old side against new (1.5 km out, 150 m over the pad, straight in): no
  arrival point is under the ground now (the old side had Alpine Serpent's 3 m under). Lines in that cross higher
  ground before the pad, as some did before: Panorama Ridge from Summit Run after 260 m, Ridge Rally from Neon Docks
  after 310 m, Timberline Rush from Midnight Chase at 10 m over the ground (old: Harbor & Highlands from Pacific Canyon
  after 40 m, Alpine Serpent from Cloudbreak at once). Not this card's; a follow-up could lift arrivals over high ground.
- The 39 suites that import the changed files, before and after; lane tier and build below.
