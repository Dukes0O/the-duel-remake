# P4-TREMBLANT: the forest circuit

Claude (Sonnet agent), 11 October 2026. Design: `docs/CIRCUITS.md` section 5.3.
Switches: `tremblant-woods` and `grand-prix` (both dev). Circuit file:
`src/circuits/tremblant-woods.js`.

## What it does

Tremblant Woods is a Grand Prix circuit now: eight cars, three laps, the five
lights, in an autumn morning (the existing golden mood, low sun).

- **Start.** The paddock kit: a gantry across the grid (its five lamps are lit by
  the start sequence through the kit loader), eleven pit garages and a pit wall on
  the right of Lodge Straight, five grandstands on the left.
- **Lodge and hill.** A wooded hill on the left of Lodge Straight with three ski
  runs cut into it (paler strips, no trees on them), the ski lodge on a level
  terrace on its lower slope, pines on the slope and a few kit autumn trees.
- **Lake.** Beside Lakeshore: a lake with soft banks of mist drifting over it and
  the wooden dock reaching into it. The planted pines keep out of it.
- **Chairlift.** Eight towers across Timber Straight, two cable lines, twenty
  chairs riding them (they shrink away at the ends instead of popping out). The
  lift crosses at the second crest, which launches the cars right under it.
  The motion is presentation only.
- **Autumn trees.** Orange, golden and copper kit trees in groves along the lap,
  mixed into the existing pines.
- **Safety kit.** Armco on the outside of Pine Drop, Lakeside Plunge, Ridge
  Corner, Lodge Bend and Final Turn; tyre walls at the end of Beaver Hairpin and at
  Ridge Corner; marshal posts; catch fence along Timber Straight and The Spur
  (they face each other across the divide); kit braking boards (150, 100, 50) at
  Ridge Corner and Devil's Chicane, which the track script leaves without.
- **Mood.** Light comes from the existing `golden` mood, as before.

Everything is placed from the road in the circuit file, so a change to the script
carries the scenery with it. Kit pieces use the loader's `kitPlacements` format.

## Forced changes to the road

Reported for Claude (the road layout is Claude's).

1. **Timber Straight has its two crests.** CIRCUITS 5.3 asks for crests of 1.5 m
   and 2.5 m on Timber Straight, but the script had none, and the chairlift
   moment needs the second. A piece has one crest, so the straight is three
   pieces (540, 520 and 242 m, crests 1.5 and 2.5; the total is unchanged).
   Closure moved the lap from 4,444.2 m to 4,442.8 m. The second crest is at
   s 2,701, where Claude's intel puts the chairlift flag.

## Computer racers and the racing line

The first balance run on this circuit (30 races a difficulty) showed 30, 37 and
13% first-lap pile-ups. Causes, found by tracing the racers:

- Pine Drop runs straight into Lakeside Plunge. The racing line swung kerb to
  kerb across 14 m in about 70 m, more than a car can follow, so cars ran wide
  and met in the Plunge. New optional `racingLine` block in a circuit's
  definition (`roadShare`, `maxSlope`; `src/track-script.js buildRacingLine`):
  the line uses 85% of the room to each edge and may move 0.08 m across per
  metre. Off unless a circuit asks.
- A crest inside a corner launches a racer off its line. Racers now hold their
  speed down over a crest inside a corner (`src/race-lines.js crestLimits`;
  scripted circuits only, so Pacific Canyon and every released event are
  unchanged). On a straight they may fly.
- A circuit may set `fieldPace` (one number or one per difficulty,
  `src/race-field-driver.js`). Tremblant uses Easy .87, Medium .85, Hard .85.

Test driver for authored circuits: `tools/race-field-balance.mjs --course <id>`
adds a circuit that is off to `COURSE` for the run. On a circuit the driver now
takes its line and speed from the circuit's racing line (the same profile the
racers use, built for the player's car at `LINE_SKILL` .86 of its limit; the
standard autopilot cannot brake for a hairpin) and steers with the racers' own
controller. Pacific Canyon runs are exactly as before.

### Balance (30 seeded races per difficulty, falcone_f42, `--jobs 4`)

| | Easy | Medium | Hard | Target |
| --- | ---: | ---: | ---: | --- |
| Test driver wins | 77% | 43% | 13% | 60-80 / 30-50 / 10-25 |
| Racers that finish | 100% | 100% | 100% | at least 95% |
| First-lap pile-ups | 1 of 30 | 2 of 30 | 0 of 30 | at most 1 in 20 |
| Passes between computer racers | 9.5 | 11.4 | 11.3 | at least 3 on Medium |

Medium shows two pile-ups in thirty races (6.7%), a little over the one in
twenty target. They are pairs of cars touching at the braking zone after
Lakeshore (leaders side by side into Fir Esses). Left for the finishing pass.

## Frame cost (1280x720, `tools/scenarios/tremblant-views.mjs`)

| Quality | View | p50 | p95 | Frames over 33 ms | Draw calls | Triangles |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| High | 8 cars on the grid, lamps lit | 17.7 ms | 18.1 ms | 0 | 2,133 | 5.36 M |
| High | 8 cars on Timber Straight | 17.7 ms | 18.2 ms | 0 | 1,529 | 3.80 M |
| Performance | 8 cars on the grid | 17.6 ms | 18.2 ms | 0 | 1,395 | 3.54 M |
| Performance | 8 cars on Timber Straight | 17.6 ms | 18.2 ms | 2 | 1,064 | 2.73 M |

Usual limit: p95 at most 33.5 ms, at most 12 slow frames of 120.

The kit loader checks every kit triangle against the road at load. For this
circuit's 368 placements that takes about 8 s headless, and nearly all of it is
the kit trees (each costs about 0.09 s). The scenery has fewer trees for that
reason (36 in groves, 12 on the hill). An early-out in the loader's clearance
check (skip a piece whose box is far from every road) would remove most of it.

## Hooks outside the card's files

- `src/race-field.js`: `tremblant-woods` joins `GRAND_PRIX_COURSES` (the card's
  own line).
- `src/track-script-course.js`: `scenery.clear` zones, hills and kit clearance
  keep planted scenery out of places a circuit draws itself; trees on a hill.
  Nothing changes for a circuit that sets none of them (the random stream is the
  same).
- `src/track-script-scene.js`: one call, `addCircuitEffects`.
- New: `src/circuit-effects.js` (lake, mist, hills, chairlift motion),
  `src/circuit-hills.js`.
- `src/race-lines.js`, `src/race-field-driver.js`, `src/track-script.js`: the
  racing-line options, crest limit and `fieldPace` above.
- `src/track-analysis.js lapCrossing`: the last row of a lap sits on the line to
  within rounding; the exact comparison failed for this circuit's length. A 1e-6
  m tolerance.
- `tools/track-review.mjs`: `--flags` now also reaches the headless lap, so a
  circuit that is off can be reviewed.

## Changed assertions and data

- `tools/test-circuit-layouts.mjs`, Tremblant road test: the Timber Straight
  length assertion now sums the three pieces (still 1,305 m within 3 m) and checks
  their crests. Nothing weakened.
- `src/generated/reference-laps.json`: the `tremblant-woods|fixed` record was
  rebuilt (geometry and racing line changed). 77.068 s (was 91.075 s); the other
  26 records are untouched. `tools/test-reference-laps.mjs` and
  `tools/test-track-analysis.mjs` pass.

## Tests and checks

`node tools/test-circuit-tremblant.mjs` (new, 12 checks): Grand Prix entry and
pace, crests and the lift at the second crest, racing-line slope and crest limit,
a full Grand Prix race with seven finishers, kit ids, clearance of every piece
from every road, paddock sides, safety kit on the outside of the fast corners,
lake, hill and lift away from the road, no tree on a ski run, the level terrace,
the same scenery every build.

Browser: `node tools/browser-harness.mjs scenario tremblant-views` (14 landmark
views, lamps lit on the grid, frame cost above): passes with no browser errors.
Review tool output: `.evidence/<date>/review/tremblant-woods/`.

## Open for the finishing pass

- The track script makes boards only before Beaver Hairpin (one board, at 50 m);
  the corners with `brakeBoard` notes in the intel (Ridge Corner, Devil's Chicane)
  got kit boards from this card. Beaver Hairpin has no board at 150 or 100 m
  because Beaver Kink lies there (`boards: true` on the Kink would not help: the
  rule wants straight road).
- Tyre walls read as black stacks from a distance; the stands have no crowd yet
  (the arena crowd is not wired to circuits).
- The lake is the rising ground meeting a flat water plane, so its shore follows
  the terrain; a pond rather than a lake. Mist is twelve soft sprites.
- Lap time of the reference driver is 1:17, under the 1:30 to 2:15 target.
- The racers' pace is tuned to a test driver that cannot overtake as well as a
  person; wins by a human will be higher.

## Removed

Nothing removed. The single Timber Straight piece is replaced by three pieces in
the same file.
