# EIFEL-CROWN-C4: scenery, round 1

Status: round 1 of at most 3, ready for Claude's picture judgement. The switch
`eifel-crown` stays `dev`; with it off the released Eifel is exactly as it was.
Stop after round 1. Nothing merged or pushed.

Sheet: `docs/board/looks/eifel-crown/round-1.jpg` (491,740 bytes, six native High views
beside the generated reference pictures). Copy for Claude:
`C:/Users/kyleb/AppData/Local/Temp/claude/C--Users-kyleb-dev-the-duel-remake--claude-worktrees-project-status-remote-plan-fa06b8/3382fa7b-51ba-42b5-b7c3-db65ae96eb7c/scratchpad/eifel-c4-round1.jpg`.

## What was reused (placed first)

- Spruce: the course's own near band (18 to 58 m behind the road edge, 8 rows) and far band of
  groves with meadow between them, the same planting code Ardennes uses. About 5,700 near and
  4,100 far trees (Ardennes: 9,100 and 4,100 on a longer lap).
- Beeches: the `ardennes-beech` kit, seven groves in the back rows of the wood (26 m or more out),
  376 of them (Ardennes has 191). Spruce stays in the first rows.
- Armco on the outside of every corner under a 150 m radius, from 16 m before to 56 m after,
  runs of neighbouring corners joined. Last Turn has a tyre wall and two marshal posts instead.
- Braking boards: the nine existing rows, unchanged.
- Paddock: start gantry, eight garages on the right, three stands on the left. The lodge is C5 and
  has open ground on the left beyond the stands.
- Valley mist (four banks), damp dark road, wet-road switch, the Ardennes ground colour hooks
  (cool damp wash beyond the verge, dark meadow beside corners).
- Meadow openings: the forest opens out to 44 m on both sides on Crown Climb to Ridge Top and on
  Hatch Sweep to Pine Right, with woods behind the field boundaries.

## What is new

- `drystone-wall` (4 m long, 1.25 m high, 0.63 m deep, 522 / 176 triangles) and `hedge-row`
  (4 m, 1.79 m high, 0.94 m deep, 350 / 96 triangles), both Blender recipes in
  `tools/blender/eifel/scenery.py` (original boxes and a displaced ring, fixed seeds, no outside
  models or textures, matt, specular off). Measured sizes and file hashes in
  `tools/blender/eifel/scenery.json`. GLBs committed, no `.blend`.
- Field boundaries: wall and hedge 17 m past the road edge on the two ridge meadows and the
  field side of Village Street, with gateways, a hedge behind some walls, and cross walls
  dividing the meadow into fields. None on the inside of a corner under 150 m radius.
- Kerb colour setting: `kerbColours: [first, second]` on a course (small change in
  `src/track-script-scene.js`, default unchanged). Eifel Crown uses **green and white**.
- Shared-code hooks: two ids appended to the kit list and to the continuous-lining set
  (`src/track-kits.js`), two solid footprints (`src/kit-footprints.js`), and the beech grove
  logic opened to `eifel-crown` as well as Ardennes (`src/vegetation.js`, `src/world.js`).

## Left open for C5

Castle crag (outside Wall Left, 90 to 260 m out), village (right of Village Street, 12 to 64 m),
reservoir (inside Reservoir Right, 80 to 260 m out) and the lodge are kept free of trees. The
armco on the outside of Wall Left runs along the village side; C5 may thin it where a street joins.
Stream under Forest Dip is C5 too.

## Findings for Claude

- `defaultMood: 'overcast'` is only a descriptor (tools/visual-check.js reads it); in the game the
  light mood is the player's setting. The pictures set `overcast` the way the visual check does.
  A course-owned overcast needs a light-path look, which does not exist and was not added.
- The light eases toward the mood over a few seconds, so the picture recipe waits until it has
  stopped moving (earlier shots showed sunlit tan walls from the clear-day light).
- The `ardennes-beech` leaves are bright lime next to the spruce; `kitLook.leafColour` only
  matches the autumn-tree leaf names, so a duller green needs a change to the beech recipe or
  to that matcher. Not done in round 1.
- The generated reference shows the Armco close to the road edge; here it stands 12.8 m out,
  beyond the 12 m run-off, because the road keeps its run-off and physics.

## Checks

- `node --test tools/test-circuit-eifel.mjs`: 10 pass (6 old, 4 new: recipe output, budgets and
  box sizes; approved kits and run-off; all real files load and pass every triangle clearance
  rule with beeches included; kerbs, damp road, beech and tree counts, kept-open rooms).
- `node tools/drive-through.mjs --course eifel-crown --json`: PASS. Ground issues 0, easy,
  medium and hard laps 130.192, 130.242, 130.292 s (identical to C2: scenery changes no race
  number), 16 barrier probes (8 corners at 70 and 110 mph) all pass.
- By hand: `tools/test-circuits.mjs` PASS (208,982 checks, also with the switch on),
  `tools/test-ground-rows-exact.mjs` PASS, `tools/test-world-composition.mjs` PASS (other
  courses' signatures unchanged).
- Lane tier (`--tier lane --changed --jobs 2 --keep-going`, 138 suites): 135 passed on the first run.
  The three that did not were fixed or run alone and then passed: `test-pit-lane` (list of courses
  with a damp road now also holds `eifel-crown`, see below), `test-review-evidence` (needed
  `round-1-review.md` next to the sheet) and `test-track-kits` (no result in the lane run, passes
  alone in 314 s: 1,802 actual Eifel High/LOD placements validated). Not rerun as a whole lane
  after those three fixes.
- `npm run build` (via `node node_modules/vite/bin/vite.js build`, no `.bin`): PASS, 1.09 s.
- Browser: `node tools/run-browser-scenarios.mjs --scenarios eifel-scenery-views --jobs 1`,
  six pictures at 1280 x 720, zero warnings or errors, memory-only saves, no frame timing.

## Changed assertions (Claude to review)

- `tools/test-track-kits.mjs`: kit count 46 to 48, two ids appended; first 46 and their order
  unchanged.
- `tools/test-circuit-barriers.mjs`: the footprint-versus-measured-size check also reads
  `tools/blender/eifel/scenery.json` (same .02 m tolerance, as Kogane's table already is).
- `tools/course-ground-checks.mjs`: for `eifel-crown` the barrier probes use the middle of eight
  named corners (as Tremblant does) instead of every-nth rail row. A car that slides out near the
  end of a rail run passes the end by design, so the every-nth rows tested luck: one sampled row
  (s 3016) failed on the first run. Limits, speeds and pass rule unchanged.

- `tools/test-pit-lane.mjs` line 321: the courses with a damp road are `['ardennes-forest', 'eifel-crown']`
  (only when listing the preview definition; the released Eifel has none). Nothing loosened.

## Removed

Nothing replaced yet: the old Eifel scenery stays with the released entry until C7. Scratch
captures, test copies and `.qa-dist` helpers made here were deleted; Claude's scratchpad was
not touched except the one named sheet.
