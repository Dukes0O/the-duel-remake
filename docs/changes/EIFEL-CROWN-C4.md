# EIFEL-CROWN-C4: scenery, round 2

Status: round 2 of at most 3, ready for Claude's picture judgement. The switch `eifel-crown`
stays `dev`; with it off the released Eifel is exactly as it was. Not merged or pushed.

Round 1 verdict (Claude): NOT YET. Kerbs, paddock and C5 clearings good; ground-probe change
accepted. Woods too far back and thin, lime beech leaves, flat lawns, bare far hills, neat wall,
faceted hedge. Round 2 answers each point below. Light is untouched (overcast stays a player
setting); the picture recipe still waits for the light to settle.

Sheet: `docs/board/looks/eifel-crown/round-2.jpg` (478,872 bytes, six native High views beside the
generated references; round 1 deleted). Copy for Claude: scratchpad `eifel-c4-round2.jpg`.

## Round 2 changes

1. Woods: near band now starts 14 m past the road edge (just beyond the 12 m run-off), seven rows
   to 38 m, crowns allowed to touch (`crowd` 2.2 instead of the fixed 3.2) and `insideOpen` 22 m
   instead of 30 m on the inside of corners. Two small options added to the plantBand code in
   `src/track-script-course.js` (defaults unchanged, so no other course moves). Trees in the first
   20 m: roughly one every 3 m per side. The start meadow clear zone is now 150 m long, with only
   the left side (lodge ground) open to 300 m. Near trees 8,243 (budget kept under 9,000).
2. Verge: `groundLeaves.verge` (new colour-only option in `src/world-surfaces.js`) darkens a wet
   strip of grass from 3 to 12 m past the edge. It is a colour band, not a modelled ditch: the
   ground mesh has no vertices fine enough for a shallow channel.
3. Beech: leaf tint through the existing `kitLook` (matcher in `src/track-kits.js` now also accepts
   the beech leaf material name), colour 0x66755c, a darker greyer green. Beech stands from the
   first row (`setback` 0) among the spruce: 393 of them in seven groves of 20 m reach.
4. Meadows: patches of lighter hay and darker damp grass (`groundLeaves.colours`), more cross
   hedges and walls (two more on the Crown ridge, five on Hatch Sweep to Ridge Straight). Far
   forest widened to 340 m with broader groves (4,525 far trees, the same as Ardennes' band) so
   the far hills carry forest.
5. Wall: rougher. Four loose courses of stones of very different size, tilted and sunk or proud,
   more moss and lichen, ragged cope stones of mixed width and height, some leaning, some
   missing, with moss cushions. 492 / 146 triangles. Hedge: two close greens in soft blotches
   instead of a colour per face, half the bump, 18 segments, 416 / 96 triangles. New sizes in
   `tools/blender/eifel/scenery.json` and `src/kit-footprints.js`.

## What was reused (placed first)

- Spruce: the course's own near band and far band of groves, the same planting code Ardennes uses
  (counts in round 2 above; Ardennes has 9,100 near and 4,100 far on a longer lap).
- Beeches: the `ardennes-beech` kit in seven groves (round 2 above; Ardennes has 191).
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

- `drystone-wall` (4 m long, 1.35 m high, 0.69 m deep) and `hedge-row`
  (4 m, 1.77 m high, 0.91 m deep), triangle counts in round 2 above, both Blender recipes in
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

## Findings for Claude (round 1, still open unless marked)

- `defaultMood: 'overcast'` is only a descriptor (tools/visual-check.js reads it); in the game the
  light mood is the player's setting. The pictures set `overcast` the way the visual check does.
  A course-owned overcast needs a light-path look, which does not exist and was not added.
- The light eases toward the mood over a few seconds, so the picture recipe waits until it has
  stopped moving (earlier shots showed sunlit tan walls from the clear-day light).
- Beech leaf colour: done in round 2 through the matcher.
- The generated reference shows the Armco close to the road edge; here it stands 12.8 m out,
  beyond the 12 m run-off, because the road keeps its run-off and physics.

## Checks (round 2)

- `node --test tools/test-circuit-eifel.mjs`: 10 pass. Updated checks: far trees up to 5,000, beech
  stands from the wood's first row, plus new ones for dull beech colour, the damp verge, 700+
  trees within 20 m of the edge and none inside the 12 m run-off, beech among the front rows.
- `node tools/drive-through.mjs --course eifel-crown --json`: PASS, zero ground issues, laps
  130.192 / 130.242 / 130.292 s (unchanged), all 16 barrier probes pass.
- By hand, all pass: `tools/test-circuits.mjs` (208,982 checks, also with the switch on),
  `tools/test-ground-rows-exact.mjs`, `tools/test-world-composition.mjs` (57 checks). Other
  courses' signatures and replay fingerprints unchanged, so the shared options are inert for them.
- Whole lane tier once at the end (`--tier lane --changed --jobs 2 --keep-going`, 203 suites):
  202 passed. `test-track-kits` printed no result in the lane log (same as round 1) and passes
  alone in 442 s with 1,862 actual Eifel High/LOD placements validated. No assertion changed.
- `npm run build` (`node node_modules/vite/bin/vite.js build`): PASS, 1.55 s.
- Browser: `node tools/run-browser-scenarios.mjs --scenarios eifel-scenery-views --jobs 1`, six
  pictures at 1280 x 720, zero warnings or errors, memory-only saves, no frame timing.

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
