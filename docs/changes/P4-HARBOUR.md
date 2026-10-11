# P4-HARBOUR: Harbour Lights as a Grand Prix circuit

Claude (Sonnet agent), 11 October 2026. Design: `docs/CIRCUITS.md` section 5.2.
Switch: `harbour-lights` (dev) with `grand-prix`. The road layout, walls and
boards were already merged (P4-CIRCUIT-LAYOUTS); this card adds the rest.

## What is built

- **Grand Prix, eight cars, four laps.** `harbour-lights` joins the Grand Prix
  list; a circuit may now set its own length (`grandPrixLaps`), and the field
  reads the lap count from the course (Pacific Canyon stays at three).
- **Night all lap.** A one-key light path (`lightPath`, P4-DAYNIGHT): street
  lamps, lit windows, car lamps and the moon.
- **Escape roads at Casino Corner and Lantern Hairpin.** A circuit lists
  `escapeRoads` by turn name. On the outside of that turn the wall is opened
  (about 30 m), the outer wall carries straight on beside a gravel run-off road
  (70 m and 55 m) and a tyre wall closes its end. The road script and its wall
  spans are untouched; the opening, the new wall boxes (solid, with the
  ordinary wall rules) and the gravel are made from the circuit's list
  (`src/escape-roads.js`, `src/track-script-course.js`, `src/track-script-scene.js`).
  The ground beyond the wall is ordinary off-road, so it slows the car as
  loose ground does.
- **The street, for the shared kit loader.** `src/circuit-kit-layout.js` works
  out `kitPlacements` (`{id, s, lateral, heading, scale, lift}`) from the road
  and a short description kept in `src/circuits/harbour-lights.js`: concrete
  walls with catch fences everywhere (longer pieces on straights, shorter round
  tight corners, split where the road changes width), tyre walls closing the
  run-off roads, about 265 shopfronts in varied colours close behind the walls
  of the old town, Casino Corner and the hairpin street, the Lantern Tower
  above Casino Corner, neon signs and strings of lanterns (lifted over the
  road) through the old town and above the hairpin, moored boats on the
  harbour, the start gantry across the grid, pit garages along the start
  straight and grandstands opposite. Every placement passes the loader's own
  checks (tested piece by piece against the real GLBs).
- **Harbour and reservoir water.** `basins` (Tremblant's oval format) sink the
  ground beside the road for the harbour along the Seafront Straight and
  Harbour Road and two terraced pools along the Reservoir Run;
  `src/circuit-water.js` draws the water with a faint swell and a glitter path
  toward the moon. Boats sit on the shallow floor. Scenery stays out of the
  water.
- **Wet-look road, looks only.** `wetRoad` makes the night asphalt glossier
  (`createPavedRoadMaterial({wet})`) and draws soft coloured pools on the road
  under lanterns and neon (one additive mesh). On Performance the pools are
  drawn at half strength. Grip is unchanged.

## Racing the field between walls (shared code, opt-in by circuit data)

Harbour's walls and its 9 m hairpin broke the P4-FIELD racers (a first run
had 268 crashes in a race and a pile-up every race). Everything below is read
from the circuit's definition and is off, with identical numbers, for every
other circuit. It was merged with Tremblant's parallel settings into one
mechanism per concern (their `racingLine` block, `fieldPace`, `basins`):

- `racingLine: { lineMargin, lineSwing, holdRacers }`: the line keeps 2.6 m off
  the road edge and crosses a bend by at most 60% of its sagitta (a 20 degree
  kink had been crossed twice over the whole road); `holdRacers` keeps racers to
  the corner speeds the circuit's own line allows the reference car (they had
  been allowed about 20% more than a car can turn).
- `fieldPace` (one number per difficulty, the same key Tremblant uses),
  `fieldForm`, `fieldSpread`, `fieldAggression`, and `fieldFollow`
  (`leadBraking`, `wallRoom`, `closeIn`, and a `firstLap` set with a longer gap)
  in `race-field.js` and `race-field-driver.js`.
- `basins` are Tremblant's oval basins (`src/circuit-hills.js`) for the ground;
  `water: {glitter}` asks `src/circuit-water.js` to draw harbour water over
  them (Tremblant draws its lake in `circuit-effects.js` and is unaffected).
- Balance tool (`tools/race-field-balance.mjs`, integration's version with
  Tremblant's `--course` and line-following test driver): a longer time cap for
  a long circuit, and a circuit that sets `fieldFollow` gets the same care from
  the test driver (it watches the lane it is moving to, keeps the first-lap
  gap, allows for a hard-braking leader). Pacific Canyon runs are unchanged.

## Balance (30 seeded races per difficulty, `--jobs 4`, scripted driver as you)

| | Easy | Medium | Hard | Target |
| --- | ---: | ---: | ---: | --- |
| You win | 70% | 47% | 20% | 60-80 / 30-50 / 10-25 |
| Racers that finish | 100% | 100% | 100% | at least 95% |
| First-lap pile-ups | 0 of 30 | 1 of 30 | 0 of 30 | at most 1 in 20 |
| Passes between computer racers per race | 3.3 | 3.0 | 3.8 | at least 3 on Medium |

Pace per difficulty (`fieldPace`): Easy 0.75, Medium 0.725, Hard 0.716. Win
rates move a lot with pace (0.005 on Hard moved it from 7% to 30%). These are
the numbers after merging Tremblant's test driver (the first pass with it
needed new paces; before the merge the same targets held with the older driver).
The Medium run here is 3.0 passes, right on the limit.

## Frame cost (not yet within the limit)

`node tools/browser-harness.mjs scenario harbour-night`, 1280x720, quiet slot,
eight cars at night, High preset, delivered frames (p50 / p95):

| View | Without any kit pieces | With the full street |
| --- | --- | --- |
| Start grid, 8 cars | 18.0 / 18.1 ms (3.4 M triangles, 1,502 draws) | 18.0 / **35.5 ms**, 11 frames over 33 ms (10.7 M triangles, 1,840 draws) |
| Old town, 8 cars | 17.6 / 18.1 ms | 17.7 / 18.2 ms, 5 frames over 33 ms (16.7 M triangles, 2,569 draws) |

The night lighting, water and wet road cost nothing measurable. The kit adds
7 to 13 M triangles because the shared loader draws every placement's
detailed and distant version in both views whether near or not, so cost grows
with the circuit's placement count. Codex has the culling card (chunks along
the road, only near chunks drawn, a cheaper rear view); the full street stays.
Performance has not been measured with the street yet. A race start with the
current loader takes about 30 s (per-triangle clearance check of 1,969
placements, tested in Node); the same card targets under 1 s.
**Re-measure High then Performance with the scenario once that card merges.**

## Checks

Lane tier 388/388 and build pass on the final lane commit (a first run found
`tools/test-race-surfaces.mjs` failing on a lost import and
`tools/test-shortcut-presets.mjs` on a source fingerprint, both fixed: the
basin ground now comes from Tremblant's shared basin code, so `src/course.js` is untouched). New: `tools/test-circuit-harbour.mjs` (13 checks: escape roads,
walls, racing line, placements against the kit manifest, nothing on the road,
a run-off road or in the water, wet look). Every placement was also checked
against the loader itself, piece by piece, with the real GLBs. Claude's review
tool output: `.evidence/2026-10-11/review/harbour-lights/` in the integration
folder (map, 16 frames, speed trace, pack picture, `review.json`).

## Changed assertions

None. `tools/test-circuit-layouts.mjs` and every other existing suite pass
unchanged; `tools/test-circuit-harbour.mjs` (13 checks) is new.

## Removed

Nothing replaced. Scratch drafts of an own kit loader were discarded when
Codex's shared loader was confirmed.
